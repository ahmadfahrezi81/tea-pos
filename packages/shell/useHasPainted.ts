"use client";
import { useEffect, useState } from "react";

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
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
    }, []);

    return painted;
}
