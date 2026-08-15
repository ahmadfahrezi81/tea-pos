import { ReactNode, Suspense } from "react";
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

export default async function MobileLayout({ children }: MobileLayoutProps) {
    /* Read server-side so every pay window is rendered from the real cadence in
       the first paint. Service client rather than SSR: super admins reach a
       tenant without a user_tenant_assignments row, so the RLS read on `tenants`
       would come back empty for them. The tenant id comes from the signed cookie,
       never from the request body. */
    const payFrequency = await getTenantPayFrequency(getServiceClient(), await getCurrentTenantId());

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
