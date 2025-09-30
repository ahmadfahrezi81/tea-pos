// app/mobile/layout.tsx
import { ReactNode } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <MobileLayoutClient>
            {children}
            <InactivityRefreshPopup />
        </MobileLayoutClient>
    );
}
