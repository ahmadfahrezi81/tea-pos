"use client";
import { createContext, useContext, RefObject } from "react";

interface ScrollContextValue {
    /** The shell's single scroll container, or null before it mounts. */
    scrollRef: RefObject<HTMLDivElement | null>;
}

export const ScrollContext = createContext<ScrollContextValue>({
    scrollRef: { current: null },
});

/**
 * Access to the shell's scroll region, for chrome that has to preserve the
 * user's position across its own side effects — an overlay that locks scrolling
 * while open, for instance. Route-level scroll memory is handled by the shell
 * itself and does not need this.
 */
export function useShellScroll() {
    return useContext(ScrollContext);
}
