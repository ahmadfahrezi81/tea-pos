"use client";
import { useEffect, useState } from "react";

/**
 * True once a *replacement* service worker has taken control of the page.
 *
 * `skipWaiting` + `clientsClaim` (both on by default in next-pwa) mean a new
 * worker activates the moment it installs — but that only governs the next
 * load. The page already open keeps running the JS it booted with, which for a
 * POS left open all shift is most of the day. This is the signal to offer a
 * reload; the caller decides how to ask.
 *
 * Deliberately returns a flag rather than reloading: a reload mid-order drops
 * the cart, so the choice belongs to the user.
 */
export function useServiceWorkerUpdate(): boolean {
    const [hasUpdate, setHasUpdate] = useState(false);

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

    return hasUpdate;
}
