import { ReactNode, Suspense } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";
import { StoreProvider } from "@/lib/context/StoreContext";
import { FastOrderModeProvider } from "@/lib/context/FastOrderModeContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { PostHogAnalytics } from "@/lib/posthog/PostHogAnalytics";
import { FlagsProvider } from "@/lib/context/FlagsContext";

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <StoreProvider>
            <FlagsProvider>
                <Suspense>
                    <PostHogAnalytics />
                </Suspense>
                <FastOrderModeProvider>
                    <ToastProvider>
                        <MobileLayoutClient>
                            {children}
                            <InactivityRefreshPopup />
                        </MobileLayoutClient>
                    </ToastProvider>
                </FastOrderModeProvider>
            </FlagsProvider>
        </StoreProvider>
    );
}
