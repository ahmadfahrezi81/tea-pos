import { ReactNode, Suspense } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";
import ViewportDebug from "@/components/shared/ViewportDebug";
import { StoreProvider } from "@/lib/context/StoreContext";
import { FastOrderModeProvider } from "@/lib/context/FastOrderModeContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ErrorSheetProvider } from "@/lib/context/ErrorSheetContext";
import { RealtimeProvider } from "@/lib/context/RealtimeContext";
import { PostHogAnalytics } from "@/lib/posthog/PostHogAnalytics";
import { FlagsProvider } from "@/lib/context/FlagsContext";

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
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
                                    {/* TEMPORARY — remove once the Android
                                        footer clipping is understood. */}
                                    <ViewportDebug />
                                </MobileLayoutClient>
                            </ErrorSheetProvider>
                        </ToastProvider>
                    </FastOrderModeProvider>
                </FlagsProvider>
            </StoreProvider>
        </RealtimeProvider>
    );
}
