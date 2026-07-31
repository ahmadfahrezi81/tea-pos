"use client";
import { createContext, useContext, ReactNode } from "react";
import { createPortal } from "react-dom";

/** The shell's footer region. Null until the shell has mounted. */
export const FooterSlotContext = createContext<HTMLElement | null>(null);

/**
 * Renders its children into the shell's bottom chrome, above the tab nav.
 *
 * A portal rather than shell state, deliberately. The previous version passed a
 * ReactNode up through context for the shell to store; storing it re-rendered
 * every consumer, so any page whose props changed identity between renders
 * re-ran its own effect and pushed again — an unbounded update loop. Here the
 * node stays owned by the page that declared it, mounting and unmounting with
 * that page, and nothing has to stay referentially stable.
 */
export function FooterSlot({ children }: { children: ReactNode }) {
    const target = useContext(FooterSlotContext);
    return target ? createPortal(children, target) : null;
}
