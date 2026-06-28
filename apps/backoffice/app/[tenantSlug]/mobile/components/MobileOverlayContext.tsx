"use client";
import { createContext, useContext, ReactNode } from "react";

interface MobileOverlayContextValue {
    setOverlay: (node: ReactNode) => void;
}

export const MobileOverlayContext = createContext<MobileOverlayContextValue>({
    setOverlay: () => {},
});

export function useMobileOverlay() {
    return useContext(MobileOverlayContext);
}
