// // app/mobile/layout.tsx
// import { ReactNode } from "react";
// import MobileLayoutClient from "./components/MobileLayoutClient";
// import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";

// interface MobileLayoutProps {
//     children: ReactNode;
// }

// export default function MobileLayout({ children }: MobileLayoutProps) {
//     return (
//         <MobileLayoutClient>
//             {children}
//             <InactivityRefreshPopup />
//         </MobileLayoutClient>
//     );
// }

import { ReactNode } from "react";
import MobileLayoutClient from "./components/MobileLayoutClient";
import InactivityRefreshPopup from "@/components/shared/InactivityRefreshPopup";
import { StoreProvider } from "@/lib/context/StoreContext";
import { FastOrderModeProvider } from "@/lib/context/FastOrderModeContext";
import { ProfileIconProvider } from "@/lib/context/ProfileIconContext";

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <StoreProvider>
            <FastOrderModeProvider>
                <ProfileIconProvider>
                    <MobileLayoutClient>
                        {children}
                        <InactivityRefreshPopup />
                    </MobileLayoutClient>
                </ProfileIconProvider>
            </FastOrderModeProvider>
        </StoreProvider>
    );
}
