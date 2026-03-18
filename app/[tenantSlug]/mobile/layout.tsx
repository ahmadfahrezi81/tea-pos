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

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <StoreProvider>
            <FastOrderModeProvider>
                <MobileLayoutClient>
                    {children}
                    <InactivityRefreshPopup />
                </MobileLayoutClient>
            </FastOrderModeProvider>
        </StoreProvider>
    );
}
