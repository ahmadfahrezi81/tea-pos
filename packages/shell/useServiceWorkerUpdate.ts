"use client";
import { useEffect, useState } from "react";

/** Where the build this device last *ran* is remembered between loads. */
const BUILD_ID_KEY = "tea-pos:build-id";

/**
 * `"updated"` — the page is already on the new build and only needs telling.
 * `"update"`  — the page is behind and needs a reload.
 */
export type UpdateReason = "updated" | "update" | null;

/**
 * Whether a new version is worth mentioning, and which of the two things to
 * say about it.
 *
 * **`"updated"` — the fast path, and the reason this hook was rewritten.** A
 * document that loads fresh after a deploy already shows the new UI; all that
 * is missing is telling the user it happened. Comparing the remembered build
 * id against this build's answers that with a synchronous read at mount, so
 * the sheet arrives *with* the new screen.
 *
 * Deliberately agnostic about *why* the document loaded fresh — a cold start of
 * an installed app, Next's build-skew hard navigation, or next-pwa's
 * `reloadOnOnline` all land here identically. Do not "simplify" this by tying
 * it to one of them.
 *
 * **`"update"` — the slow path, for a page that never reloads.** A till parked
 * on the POS screen all shift keeps running the JS it booted with.
 * `skipWaiting` + `clientsClaim` (both on by default in next-pwa) mean a
 * replacement worker takes over as soon as it installs, and that swap is the
 * signal used here today.
 *
 * It is a poor signal — it reports that the *worker* changed, not that this
 * page's JS is stale, and the install/activate/claim chain takes seconds. Task
 * 048 Phase 3 replaces it with a build-id check against `/api/version` on
 * foreground. Until then it is the only thing covering the parked till, so it
 * stays.
 *
 * Returns a reason rather than reloading: a reload mid-order drops the cart, so
 * the choice belongs to the user.
 */
export function useServiceWorkerUpdate(): UpdateReason {
    const [justUpdated, setJustUpdated] = useState(false);
    const [hasUpdate, setHasUpdate] = useState(false);

    useEffect(() => {
        const current = process.env.NEXT_PUBLIC_BUILD_ID;
        if (!current) return;

        let previous: string | null = null;
        try {
            previous = localStorage.getItem(BUILD_ID_KEY);
            // Written on every mount, prompt or no prompt — this is what makes
            // the *next* update detectable. A first-ever load stores the id and
            // says nothing, which is the whole of the first-install guard.
            localStorage.setItem(BUILD_ID_KEY, current);
        } catch {
            // Storage can be unavailable (private mode, blocked cookies).
            // Nothing to compare against, so say nothing.
            return;
        }

        if (previous && previous !== current) setJustUpdated(true);
    }, []);

    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
        const sw = navigator.serviceWorker;

        // A first install fires `controllerchange` too, and there is nothing to
        // reload into in that case. Tracked as a mutable local rather than read
        // once at mount: a page that loads before the very first worker installs
        // would otherwise mark every later update as a first install and never
        // prompt at all.
        let hasController = Boolean(sw.controller);

        const onControllerChange = () => {
            if (hasController) setHasUpdate(true);
            hasController = true;
        };

        // An installed app can sit open for days without ever re-checking.
        // Returning to the foreground is the cheapest natural moment to look.
        const onVisibility = () => {
            if (document.visibilityState !== "visible") return;
            void sw.getRegistration().then((registration) => registration?.update()).catch(() => {});
        };

        sw.addEventListener("controllerchange", onControllerChange);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            sw.removeEventListener("controllerchange", onControllerChange);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    // "updated" wins. A fresh load onto a new build sets both — the worker
    // swaps moments after the page it already updated — and asking someone to
    // reload a page that is current is exactly the bug being fixed.
    return justUpdated ? "updated" : hasUpdate ? "update" : null;
}
