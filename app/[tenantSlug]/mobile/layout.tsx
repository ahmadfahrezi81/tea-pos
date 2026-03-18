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

interface MobileLayoutProps {
    children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <StoreProvider>
            <MobileLayoutClient>
                {children}
                <InactivityRefreshPopup />
            </MobileLayoutClient>
        </StoreProvider>
    );
}
