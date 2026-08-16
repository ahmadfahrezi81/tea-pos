import { ReactNode, Suspense } from "react";
import { unstable_cache } from "next/cache";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@tea-pos/shell/InactivityRefreshPopup";
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

export default async function MobileLayout({ children }: MobileLayoutProps) {
    /* Read server-side so every pay window is rendered from the real cadence in
       the first paint. Service client rather than SSR: super admins reach a
       tenant without a user_tenant_assignments row, so the RLS read on `tenants`
       would come back empty for them. The tenant id comes from the signed cookie,
       never from the request body.

       Swallowed on failure because this layout wraps the till. Payroll screens
       degrade to "unavailable" without a cadence; taking orders must not depend
       on a payroll setting being readable. */
    const payFrequency = await cachedPayFrequency(await getCurrentTenantId())()
        .catch((error) => {
            console.error("[layout] pay frequency unavailable:", error);
            return null;
        });

    return (
        <PayFrequencyProvider value={payFrequency}>
            <RealtimeProvider>
                <StoreProvider>
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
                                    </MobileLayoutClient>
                                </ErrorSheetProvider>
                            </ToastProvider>
                        </FastOrderModeProvider>
                    </FlagsProvider>
                </StoreProvider>
            </RealtimeProvider>
        </PayFrequencyProvider>
    );
}
