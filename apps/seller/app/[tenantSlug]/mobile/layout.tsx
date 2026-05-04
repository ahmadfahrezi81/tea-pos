import { ReactNode } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";
import { StoreProvider } from "@/lib/context/StoreContext";
import { FastOrderModeProvider } from "@/lib/context/FastOrderModeContext";
import { ToastProvider } from "@/lib/context/ToastContext";

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <StoreProvider>
            <FastOrderModeProvider>
                <ToastProvider>
                    <MobileLayoutClient>
                        {children}
                        <InactivityRefreshPopup />
                    </MobileLayoutClient>
                </ToastProvider>
            </FastOrderModeProvider>
        </StoreProvider>
    );
}
