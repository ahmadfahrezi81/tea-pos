import { ReactNode } from "react";
import { unstable_cache } from "next/cache";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@tea-pos/shell/InactivityRefreshPopup";
import WhatsNew from "@tea-pos/shell/WhatsNew";
import { patchNotes } from "@/lib/patch-notes";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ErrorSheetProvider } from "@/lib/context/ErrorSheetContext";
import { PayFrequencyProvider } from "@/lib/context/PayFrequencyContext";
import { StoreFilterProvider } from "@/lib/context/StoreFilterContext";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getTenantPayFrequency } from "@tea-pos/services/tenants";

/**
 * Five minutes, because this layout wraps every screen *and* every prefetch of
 * one — `navigation.ts` marks five routes `prefetch: true`, so uncached a single
 * open pays for this read half a dozen times, blocking a render each time, for a
 * value that changes a few times a year.
 *
 * TTL rather than `revalidateTag`: the write lives on the pay-schedule screen in
 * this same app, but seller reads the same setting from its own deployment and
 * cache, so neither side can invalidate the other. The cadence screen already
 * warns that a change applies from the next period, which is far longer than
 * five minutes of staleness.
 *
 * The Supabase client is built inside the cached function rather than passed in:
 * `unstable_cache` folds its arguments into the key, and a client object has no
 * business in one.
 */
const CACHE_SECONDS = 300;

function cachedPayFrequency(tenantId: string) {
    return unstable_cache(
        () => getTenantPayFrequency(getServiceClient(), tenantId),
        ["pay-frequency", tenantId],
        { revalidate: CACHE_SECONDS, tags: [`pay-frequency-${tenantId}`] },
    );
}

export default async function MobileLayout({ children }: { children: ReactNode }) {
    /* Read server-side so every pay window is rendered from the real cadence in
       the first paint. Service client rather than SSR: super admins reach a
       tenant without a user_tenant_assignments row, so the RLS read on `tenants`
       would come back empty for them. The tenant id comes from the signed cookie,
       never from the request body.

       Swallowed on failure so an unreadable payroll setting degrades the pay
       screens rather than blanking every screen in the app. */
    const payFrequency = await cachedPayFrequency(await getCurrentTenantId())()
        .catch((error) => {
            console.error("[layout] pay frequency unavailable:", error);
            return null;
        });

    return (
        <PayFrequencyProvider value={payFrequency}>
            <ToastProvider>
                <ErrorSheetProvider>
                    {/* Above the shell: the store filter drives the header's
                        picker as well as the screens under it. */}
                    <StoreFilterProvider>
                        <MobileLayoutClient>
                            {children}
                            <InactivityRefreshPopup />
                            {/* Literals, not `useT`: this app has no i18n
                                layer. The seller passes translated copy into
                                the same component. */}
                            <WhatsNew
                                notes={patchNotes}
                                version={process.env.NEXT_PUBLIC_APP_VERSION}
                                copy={{
                                    title: "What's New",
                                    scrollToContinue: "Scroll to continue",
                                    gotIt: "Got it",
                                    close: "Close",
                                }}
                            />
                        </MobileLayoutClient>
                    </StoreFilterProvider>
                </ErrorSheetProvider>
            </ToastProvider>
        </PayFrequencyProvider>
    );
}
