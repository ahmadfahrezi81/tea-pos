"use client";
import { useEffect } from "react";

/**
 * How long after a resume to measure again, for platforms that hand us the old
 * size first and settle on the real one a moment later.
 */
const SETTLE_MS = 300;

/**
 * Keeps the shell pinned to the real viewport height when running installed.
 *
 * In a browser tab CSS already gets this right and this hook stays out of the
 * way: svh is measured against the largest URL-bar state, so the shell does not
 * resize every time the bar hides and shows.
 *
 * Installed, there is no URL bar, and the CSS units go stale instead. Android
 * is the reproducible case — leave the app idle, let the screen sleep, come
 * back, and the viewport the system reports no longer matches what dvh resolved
 * to when the page loaded. The shell keeps its old, taller height, so the footer
 * sits below the bottom of the screen and gets clipped. Reloading fixes it,
 * which is the tell: the platform knows the correct size, only the cached unit
 * does not. iOS has its own version of this after a full document load inside
 * the standalone window, which is what the /auth/callback redirect on login is.
 *
 * The height read here must be the *layout* viewport — the same thing vh units
 * measure, and the same thing interactive-widget=resizes-content shrinks for the
 * Android keyboard — so that writing it preserves the existing behaviour rather
 * than replacing it.
 *
 * `documentElement.clientHeight` is that on every engine. `window.innerHeight`
 * is not: on WebKit it reports the *visual* viewport, so it shrinks when the
 * user pinch-zooms and when the iOS keyboard opens. Reading it collapsed the
 * shell on iOS — the tab bar rode up the screen with bare page background below
 * it — which is the whole reason this note exists.
 */
export function useStandaloneViewportHeight() {
    useEffect(() => {
        const standalone = window.matchMedia("(display-mode: standalone)");
        const root = document.documentElement;

        const apply = () => {
            if (!standalone.matches) {
                // In a tab the CSS unit wins, so make sure a value left over
                // from a standalone match cannot keep overriding it.
                root.style.removeProperty("--shell-height");
                return;
            }
            root.style.setProperty("--shell-height", `${root.clientHeight}px`);
        };

        // Being told the app is visible again does not mean the viewport has
        // finished changing — the system bars may still be animating, and there
        // is no event for "that is done now". So measure across the next frame
        // and once more shortly after. Writing the same value again is a no-op.
        let frame = 0;
        let timer: ReturnType<typeof setTimeout>;
        const applyThenSettle = () => {
            apply();
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
            clearTimeout(timer);
            timer = setTimeout(apply, SETTLE_MS);
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") applyThenSettle();
        };

        apply();

        // resize fires for the keyboard and for system-bar changes. The resume
        // signals overlap on purpose: which ones fire depends on whether the app
        // was frozen, restored from bfcache, or merely backgrounded, and missing
        // the resume is the whole bug.
        window.addEventListener("resize", apply);
        window.visualViewport?.addEventListener("resize", apply);
        window.addEventListener("orientationchange", applyThenSettle);
        window.addEventListener("pageshow", applyThenSettle);
        window.addEventListener("focus", applyThenSettle);
        document.addEventListener("visibilitychange", onVisibilityChange);
        // iOS can evaluate display-mode late, so re-check rather than sampling
        // it once at mount.
        standalone.addEventListener("change", apply);

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            window.removeEventListener("resize", apply);
            window.visualViewport?.removeEventListener("resize", apply);
            window.removeEventListener("orientationchange", applyThenSettle);
            window.removeEventListener("pageshow", applyThenSettle);
            window.removeEventListener("focus", applyThenSettle);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            standalone.removeEventListener("change", apply);
            root.style.removeProperty("--shell-height");
        };
    }, []);
}
