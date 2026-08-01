"use client";
import { createContext, useContext, useEffect, ReactNode } from "react";
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

    /* Say out loud that the slot is occupied, so the shell can paint the footer
       — including the safe-area strip below the button — white.

       The shell used to infer this with :has(> :not(:empty)) on this div. That
       reads correctly only if the browser re-runs the selector when the div
       gains its first child, and it does not: React commits the target empty
       and the portal fills it on a later commit. On a page that also renders
       the tab nav the rule still matched, because the nav is a non-empty child
       from the first paint — but on a subpage this div is the footer's only
       child, so the strip under the button stayed slate.

       Marking the node imperatively rather than lifting occupancy into shell
       state keeps the property this file was written for: nothing re-renders,
       so no consumer can be pushed into the update loop described above. */
    useEffect(() => {
        if (!target) return;
        target.classList.add("is-occupied");
        return () => target.classList.remove("is-occupied");
    }, [target]);

    return target ? createPortal(children, target) : null;
}
