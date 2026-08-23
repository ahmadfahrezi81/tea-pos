import { ReactNode, Suspense } from "react";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@tea-pos/shell/InactivityRefreshPopup";
import WhatsNewMount from "./components/WhatsNewMount";
import { StoreProvider } from "@/lib/context/StoreContext";
import { FastOrderModeProvider } from "@/lib/context/FastOrderModeContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ErrorSheetProvider } from "@/lib/context/ErrorSheetContext";
import { RealtimeProvider } from "@/lib/context/RealtimeContext";
import { PostHogAnalytics } from "@/lib/posthog/PostHogAnalytics";
import { FlagsProvider } from "@/lib/context/FlagsContext";
import { PayFrequencyProvider } from "@/lib/context/PayFrequencyContext";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getTenantPayFrequency } from "@tea-pos/services/tenants";
import { listUserStores } from "@tea-pos/services/stores";
import { StoreListResponse } from "@tea-pos/features/stores/schema";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { BootFallback } from "@/lib/context/BootFallback";

interface MobileLayoutProps {
    children: ReactNode;
}

/**
 * Five minutes, because this layout wraps every mobile screen *and* every
 * prefetch of one: uncached, a single boot pays for this read a dozen times
 * over, on the critical path each time, for a value that changes a few times a
 * year.
 *
 * TTL rather than `revalidateTag`, because the write lives in backoffice — a
 * separate deployment with its own cache, which cannot invalidate this one. The
 * cadence screen already warns that a change only applies from the next period,
 * so five minutes of staleness is well inside what the feature tolerates.
 *
 * The Supabase client is built inside the cached function, not passed in:
 * `unstable_cache` folds its arguments into the key, and a client object has no
 * business in one. Same reasoning as the products route.
 */
const CACHE_SECONDS = 300;

function cachedPayFrequency(tenantId: string) {
    return unstable_cache(
        () => getTenantPayFrequency(getServiceClient(), tenantId),
        ["pay-frequency", tenantId],
        { revalidate: CACHE_SECONDS, tags: [`pay-frequency-${tenantId}`] },
    );
}

/**
 * Shorter than the pay-frequency window because store assignments are edited by
 * hand, and the picker showing a stale roster is more noticeable than a stale
 * pay cadence. SWR revalidates against `/api/stores` after boot regardless, so
 * this only has to be fresh enough for the *first* paint.
 *
 * The key carries the user id as well as the tenant, and that is not optional:
 * this is a per-user roster, so a tenant-only key would hand one seller another
 * seller's store list.
 */
const STORES_CACHE_SECONDS = 60;

function cachedUserStores(tenantId: string, userId: string) {
    return unstable_cache(
        async () => {
            const data = await listUserStores(getServiceClient(), {
                tenantId,
                userId,
            });
            const parsed = StoreListResponse.safeParse(data);
            return parsed.success ? parsed.data : null;
        },
        ["user-stores", tenantId, userId],
        { revalidate: STORES_CACHE_SECONDS, tags: [`user-stores-${tenantId}`] },
    );
}

export default async function MobileLayout({ children }: MobileLayoutProps) {
    /* Read server-side so every pay window is rendered from the real cadence in
       the first paint. Service client rather than SSR: super admins reach a
       tenant without a user_tenant_assignments row, so the RLS read on `tenants`
       would come back empty for them. The tenant id comes from the signed cookie,
       never from the request body.

       Swallowed on failure because this layout wraps the till. Payroll screens
       degrade to "unavailable" without a cadence; taking orders must not depend
       on a payroll setting being readable. */
    const tenantId = await getCurrentTenantId();

    /* The store list is fetched here so the boot loader does not have to wait on
       a client round trip: `MobileLayoutClient` holds the shell until it
       arrives, and a client fetch cannot even start until hydration is done.
       Seeded into SWR below, which still revalidates in the background.

       Same failure posture as the cadence — null falls through to the client
       fetch, so a bad read costs speed rather than the till. */
    const requestUser = await getRequestUser();

    const [payFrequency, initialStores] = await Promise.all([
        cachedPayFrequency(tenantId)().catch((error) => {
            console.error("[layout] pay frequency unavailable:", error);
            return null;
        }),
        requestUser
            ? cachedUserStores(tenantId, requestUser.id)().catch((error) => {
                  console.error("[layout] store list unavailable:", error);
                  return null;
              })
            : null,
    ]);

    /* Read on the server so the first render picks the same store the browser
       last used. See `persistStoreId` in StoreContext for why localStorage
       alone cannot do this. */
    const initialSelectedStoreId =
        (await cookies()).get("selectedStoreId")?.value ?? "";

    return (
        <PayFrequencyProvider value={payFrequency}>
            <RealtimeProvider>
                <BootFallback stores={initialStores}>
                    <StoreProvider initialSelectedStoreId={initialSelectedStoreId}>
                        <FlagsProvider>
                            <Suspense>
                                <PostHogAnalytics />
                            </Suspense>
                            <FastOrderModeProvider>
                                <ToastProvider>
                                    <ErrorSheetProvider>
                                        <MobileLayoutClient>
                                            {children}
                                            <InactivityRefreshPopup />
                                            <WhatsNewMount />
                                        </MobileLayoutClient>
                                    </ErrorSheetProvider>
                                </ToastProvider>
                            </FastOrderModeProvider>
                        </FlagsProvider>
                    </StoreProvider>
                </BootFallback>
            </RealtimeProvider>
        </PayFrequencyProvider>
    );
}
