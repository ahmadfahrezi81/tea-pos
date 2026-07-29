"use client";
import { createContext, useContext, ReactNode } from "react";

interface FooterSlotContextValue {
    setFooterSlot: (node: ReactNode) => void;
}

export const FooterSlotContext = createContext<FooterSlotContextValue>({
    setFooterSlot: () => {},
});

export function useFooterSlot() {
    return useContext(FooterSlotContext);
}
