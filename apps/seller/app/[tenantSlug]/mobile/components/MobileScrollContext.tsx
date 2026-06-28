"use client";
import { createContext, useContext, RefObject } from "react";

interface MobileScrollContextValue {
    scrollRef: RefObject<HTMLDivElement | null>;
}

export const MobileScrollContext = createContext<MobileScrollContextValue>({
    scrollRef: { current: null },
});

export function useMobileScroll() {
    return useContext(MobileScrollContext);
}
