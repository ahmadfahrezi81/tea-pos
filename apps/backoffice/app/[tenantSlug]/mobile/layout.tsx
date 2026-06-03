import { ReactNode } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";
import { ToastProvider } from "@/lib/context/ToastContext";

export default function MobileLayout({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <MobileLayoutClient>
                {children}
                <InactivityRefreshPopup />
            </MobileLayoutClient>
        </ToastProvider>
    );
}
