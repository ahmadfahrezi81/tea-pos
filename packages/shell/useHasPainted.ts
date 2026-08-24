"use client";
import { useEffect, useState } from "react";

/**
 * Upper bound on the wait, because this hook gates `MobileShell`'s `ready`, and
 * `ready` decides whether the app's children render at all — not merely whether
 * a loader is on top of them.
 *
 * `requestAnimationFrame` does not fire in a backgrounded or hidden document.
 * Without a cap, an app that finishes loading while the user is elsewhere sits
 * on the loader until they return. It self-heals — queued callbacks run on
 * becoming visible again — but the timer this replaced fired regardless of
 * visibility, and a gate this load-bearing should not be strictly weaker than
 * what came before it.
 *
 * Long enough that it never pre-empts a paint that was coming: two frames is
 * ~32ms on a 60Hz screen, so this only expires when frames have stopped.
 * `public/launch.html` caps its own wait the same way, for the same reason.
 */
const PAINT_MAX_MS = 2000;

/**
 * Whether the browser has painted a frame since this component mounted.
 *
 * Used to gate the boot loader's dismissal on the loader having provably been
 * on screen, rather than on a timer guessing at the same thing. Both apps seed
 * SWR from their layout, so bootstrap data is frequently present on the first
 * render — without a gate the loader is created and destroyed in a single
 * commit and the app opens with no acknowledgement at all.
 *
 * Two nested frames are what make it a fact: the first callback runs before the
 * next paint, the second after that paint has been committed. A single frame
 * would only prove the browser was about to draw.
 *
 * On a fast device this is a few tens of milliseconds and the loader is
 * short-lived, which is correct rather than a flicker — the logo either side of
 * it is continuous, held by `public/launch.html` before the app paints and by
 * the loader after, so a brief bar reads as a fast open.
 */
export function useHasPainted(): boolean {
    const [painted, setPainted] = useState(false);

    useEffect(() => {
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => setPainted(true));
        });
        const cap = setTimeout(() => setPainted(true), PAINT_MAX_MS);
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
            clearTimeout(cap);
        };
    }, []);

    return painted;
}
