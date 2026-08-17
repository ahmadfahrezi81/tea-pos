"use client";
import { useEffect, useState } from "react";

/** The build the user was offered and said no to. */
const DECLINED_KEY = "tea-pos:declined-build-id";

/** Foreground can fire in bursts; one check a minute is plenty for a deploy. */
const CHECK_THROTTLE_MS = 60_000;

/**
 * The mount check competes with the app's own boot — its stores, flags, profile
 * and socket — and it also triggers `registration.update()`, which sends the
 * worker back for `sw.js`. None of that is worth a slower first paint for a
 * sheet nobody can read in the first seconds anyway.
 */
const FIRST_CHECK_DELAY_MS = 5_000;

/** `"update"` — the page is behind and needs a new document. */
export type UpdateReason = "update" | null;

export interface AppUpdate {
    reason: UpdateReason;
    /**
     * Call when the user closes the sheet. Owned here rather than by the caller
     * because clearing it correctly needs the build id, and a plain "dismissed"
     * boolean outside would silence every later update too.
     */
    dismiss: () => void;
}

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        // Private mode, blocked cookies. Nothing remembered means nothing to say.
        return null;
    }
}

function write(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // As above — losing the write costs a redundant prompt, nothing worse.
    }
}

/**
 * Whether this page is running code the server has already replaced.
 *
 * `NEXT_PUBLIC_BUILD_ID` is a **build-time string substitution**, so the bundle
 * in an open tab carries the literal from the deployment that served it, while
 * `/api/version` is code belonging to whatever deployment is current. Different
 * strings prove the tab predates the deployment — the actual question, asked
 * directly.
 *
 * **A page that never reloads.** A till parked on the POS screen all shift keeps
 * running the JS it booted with. Checked on foreground, which is both cheap and
 * the only moment a sheet can be read.
 *
 * This replaced a `controllerchange` listener, and the reason is worth keeping:
 * that event reports the *worker* swapping, not this page's JS going stale. The
 * two agree most of the time and disagree in precisely the case that matters —
 * a fresh load installs a new worker seconds *after* delivering the new UI, so
 * the prompt landed late and asked the user to reload a page already current.
 *
 * Returns a reason rather than reloading: a reload mid-order drops the cart, so
 * the choice belongs to the user.
 *
 * **This hook used to have a second reason, `"updated"`**, for a page that had
 * already loaded the new build and only needed its server data re-rendered. It
 * asked for a tap to perform a `router.refresh()` the reader could not see the
 * result of. `WhatsNew` now owns that moment and spends it on something the
 * reader gets to read. Removing it took the whole `tea-pos:build-id` mechanism
 * with it: a reload cannot re-trigger this sheet anyway, because the fresh
 * bundle's inlined id equals what `/api/version` serves.
 */
export function useAppUpdate(): AppUpdate {
    const current = process.env.NEXT_PUBLIC_BUILD_ID;
    const [servedBuildId, setServedBuildId] = useState<string | null>(null);

    useEffect(() => {
        if (!current) return;
        let cancelled = false;
        let lastCheckedAt = 0;

        const check = async () => {
            if (document.visibilityState !== "visible") return;
            if (Date.now() - lastCheckedAt < CHECK_THROTTLE_MS) return;
            lastCheckedAt = Date.now();

            // Unrelated to the sheet, but the same moment is the right one: an
            // installed app can sit open for days without the worker ever
            // re-checking what it has cached for the next cold start.
            void navigator.serviceWorker
                ?.getRegistration()
                .then((registration) => registration?.update())
                .catch(() => {});

            try {
                const response = await fetch("/api/version", { cache: "no-store" });
                if (!response.ok) return;
                const { buildId } = await response.json();
                if (cancelled || typeof buildId !== "string") return;
                if (buildId !== current && buildId !== read(DECLINED_KEY)) {
                    setServedBuildId(buildId);
                }
            } catch {
                // Offline, or the endpoint is unreachable. Neither is evidence
                // of a stale build, so say nothing.
            }
        };

        // Run once for a document the worker may have served from cache, which
        // is the one way a page can boot already behind — but after the app has
        // had the network to itself for a moment.
        const firstCheck = setTimeout(() => void check(), FIRST_CHECK_DELAY_MS);
        document.addEventListener("visibilitychange", check);

        return () => {
            cancelled = true;
            clearTimeout(firstCheck);
            document.removeEventListener("visibilitychange", check);
        };
    }, [current]);

    return {
        reason: servedBuildId ? "update" : null,

        dismiss: () => {
            // Persisted, because a declining tap does not make the tab any less
            // stale — the next foreground check would find the same build and
            // re-offer it, and a till that never reloads would be asked all
            // shift. Clearing the state as well re-arms the check for whatever
            // ships next.
            if (servedBuildId) {
                write(DECLINED_KEY, servedBuildId);
                setServedBuildId(null);
            }
        },
    };
}
