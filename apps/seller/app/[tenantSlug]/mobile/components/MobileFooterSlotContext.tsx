"use client";
import { createContext, useContext, ReactNode } from "react";

interface MobileFooterSlotContextValue {
    setFooterSlot: (node: ReactNode) => void;
}

export const MobileFooterSlotContext = createContext<MobileFooterSlotContextValue>({
    setFooterSlot: () => {},
});

export function useMobileFooterSlot() {
    return useContext(MobileFooterSlotContext);
}
