import { ReactNode } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@tea-pos/shell/InactivityRefreshPopup";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ErrorSheetProvider } from "@/lib/context/ErrorSheetContext";
import { PayFrequencyProvider } from "@/lib/context/PayFrequencyContext";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getTenantPayFrequency } from "@tea-pos/services/tenants";

export default async function MobileLayout({ children }: { children: ReactNode }) {
    /* Read server-side so every pay window is rendered from the real cadence in
       the first paint. Service client rather than SSR: super admins reach a
       tenant without a user_tenant_assignments row, so the RLS read on `tenants`
       would come back empty for them. The tenant id comes from the signed cookie,
       never from the request body.

       Swallowed on failure so an unreadable payroll setting degrades the pay
       screens rather than blanking every screen in the app. */
    const payFrequency = await getTenantPayFrequency(getServiceClient(), await getCurrentTenantId())
        .catch((error) => {
            console.error("[layout] pay frequency unavailable:", error);
            return null;
        });

    return (
        <PayFrequencyProvider value={payFrequency}>
            <ToastProvider>
                <ErrorSheetProvider>
                    <MobileLayoutClient>
                        {children}
                        <InactivityRefreshPopup />
                    </MobileLayoutClient>
                </ErrorSheetProvider>
            </ToastProvider>
        </PayFrequencyProvider>
    );
}
