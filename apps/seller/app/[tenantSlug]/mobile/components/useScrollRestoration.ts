"use client";
import { RefObject, useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * How long to keep re-applying a restore while the page is still growing.
 * Pages fetch their data after the route resolves, so the saved offset is
 * usually out of reach on the first attempt; this bounds how long we wait
 * for it to become reachable.
 */
const RESTORE_WINDOW_MS = 1200;

/** Anything the user does to take over scrolling cancels a pending restore. */
const TAKEOVER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

/**
 * The restore has to run before paint or the page visibly jumps. Effects never
 * run on the server, but React still warns if useLayoutEffect is *called*
 * during SSR, so fall back to useEffect there.
 */
const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface Options {
    /** The shell's single scroll container. */
    containerRef: RefObject<HTMLDivElement | null>;
    /** The real pathname, not the optimistic one — positions are keyed on it. */
    pathname: string;
    /** Whether this route opts into scroll memory (`preserveScroll`). */
    enabled: boolean;
    /** False while the shell is swapping pages; restoring waits for the new one. */
    ready: boolean;
}

/**
 * Remembers scroll position per route across navigations.
 *
 * The shell reuses one scroll container for every page, so when a page
 * unmounts the container collapses and the browser clamps `scrollTop` to 0 —
 * the position is gone before any effect cleanup could read it. Saving is
 * therefore explicit: the caller invokes the returned function while the
 * outgoing page is still mounted.
 */
export function useScrollRestoration({
    containerRef,
    pathname,
    enabled,
    ready,
}: Options) {
    const positions = useRef(new Map<string, number>());

    /** Call immediately before navigating away, while the page is still up. */
    const saveScroll = useCallback(() => {
        if (!enabled) return;
        const el = containerRef.current;
        if (el) positions.current.set(pathname, el.scrollTop);
    }, [containerRef, pathname, enabled]);

    useIsomorphicLayoutEffect(() => {
        if (!ready || !enabled) return;

        const el = containerRef.current;
        const target = positions.current.get(pathname) ?? 0;
        const content = el?.firstElementChild;
        if (!el || !content || target === 0) return;

        let observer: ResizeObserver | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const stop = () => {
            observer?.disconnect();
            observer = null;
            if (timer !== null) clearTimeout(timer);
            timer = null;
            for (const event of TAKEOVER_EVENTS) {
                el.removeEventListener(event, stop);
            }
        };

        // Re-apply as the content grows, since a page's data arrives after its
        // route does and the offset is out of reach until then.
        const apply = () => {
            el.scrollTop = target;
            if (Math.abs(el.scrollTop - target) <= 1) stop();
        };

        // Give up the moment the user scrolls themselves. Without this, content
        // still streaming in would yank them back to the saved offset after
        // they had already started reading somewhere else. These are input
        // events, so they never fire for our own programmatic scrolling.
        for (const event of TAKEOVER_EVENTS) {
            el.addEventListener(event, stop, { passive: true });
        }

        observer = new ResizeObserver(apply);
        observer.observe(content);
        timer = setTimeout(stop, RESTORE_WINDOW_MS);

        // Runs before paint, so a page whose data is already cached restores
        // with no visible jump at all.
        apply();

        return stop;
    }, [containerRef, pathname, enabled, ready]);

    return saveScroll;
}
