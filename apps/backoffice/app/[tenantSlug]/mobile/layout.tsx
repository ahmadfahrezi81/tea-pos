import { ReactNode } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ErrorSheetProvider } from "@/lib/context/ErrorSheetContext";

export default function MobileLayout({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <ErrorSheetProvider>
                <MobileLayoutClient>
                    {children}
                    <InactivityRefreshPopup />
                </MobileLayoutClient>
            </ErrorSheetProvider>
        </ToastProvider>
    );
}
