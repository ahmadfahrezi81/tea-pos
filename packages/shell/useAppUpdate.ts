"use client";
import { useEffect, useState } from "react";

/** The build this device last *ran*. */
const BUILD_ID_KEY = "tea-pos:build-id";
/** The build the user was offered and said no to. */
const DECLINED_KEY = "tea-pos:declined-build-id";

/** Foreground can fire in bursts; one check a minute is plenty for a deploy. */
const CHECK_THROTTLE_MS = 60_000;

/**
 * `"updated"` — the page is already on the new build and only needs telling.
 * `"update"`  — the page is behind and needs a reload.
 */
export type UpdateReason = "updated" | "update" | null;

export interface AppUpdate {
    reason: UpdateReason;
    /** Call before reloading, so the fresh page does not also announce itself. */
    markReloading: () => void;
    /**
     * Call when the user closes the sheet. Owned here rather than by the caller
     * because clearing it correctly needs the build ids, and a plain "dismissed"
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
 * Whether a new version is worth mentioning, and which of the two things to say.
 *
 * Both answers come from comparing build identities. `NEXT_PUBLIC_BUILD_ID` is
 * a **build-time string substitution**, so the bundle in an open tab carries
 * the literal from the deployment that served it, while `/api/version` is code
 * belonging to whatever deployment is current. Different strings prove the tab
 * predates the deployment — the actual question, asked directly.
 *
 * **`"updated"` — a document that loaded fresh after a deploy.** It already
 * shows the new UI; all that is missing is saying so. A synchronous read at
 * mount answers it, so the sheet arrives *with* the new screen.
 *
 * Deliberately agnostic about *why* it loaded fresh — a cold start of an
 * installed app, Next's build-skew hard navigation, and next-pwa's
 * `reloadOnOnline` all land here identically. Do not "simplify" this by tying
 * it to one of them.
 *
 * **`"update"` — a page that never reloads.** A till parked on the POS screen
 * all shift keeps running the JS it booted with. Checked on foreground, which
 * is both cheap and the only moment a sheet can be read.
 *
 * This replaced a `controllerchange` listener, and the reason is worth keeping:
 * that event reports the *worker* swapping, not this page's JS going stale. The
 * two agree most of the time and disagree in precisely the case that matters —
 * a fresh load installs a new worker seconds *after* delivering the new UI, so
 * the prompt landed late and asked the user to reload a page already current.
 *
 * Returns a reason rather than reloading: a reload mid-order drops the cart, so
 * the choice belongs to the user.
 */
export function useAppUpdate(): AppUpdate {
    const current = process.env.NEXT_PUBLIC_BUILD_ID;
    const [justUpdated, setJustUpdated] = useState(false);
    const [servedBuildId, setServedBuildId] = useState<string | null>(null);

    useEffect(() => {
        if (!current) return;
        const previous = read(BUILD_ID_KEY);
        // Written on every mount, prompt or no prompt — this is what makes the
        // *next* update detectable. A first-ever load stores the id and says
        // nothing, which is the whole of the first-install guard.
        write(BUILD_ID_KEY, current);
        if (previous && previous !== current) setJustUpdated(true);
    }, [current]);

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
        // is the one way a page can boot already behind.
        void check();
        document.addEventListener("visibilitychange", check);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", check);
        };
    }, [current]);

    return {
        /*
         * A pending update outranks having just updated. The two cannot both be
         * fresh — `servedBuildId` is only set when the server reports something
         * this page is *not* running, which a page that just loaded is not — so
         * whenever both are set, the served one is strictly newer news. Ordering
         * it the other way strands a page that announced one update and then sat
         * open across the next: `justUpdated` never clears on its own, so the
         * real update would never be able to speak.
         */
        reason: servedBuildId ? "update" : justUpdated ? "updated" : null,

        // Without this the two cases collide: reloading onto the new build
        // would leave the remembered id stale, and the fresh page would open a
        // second sheet on top of the refresh the user just asked for.
        markReloading: () => {
            if (servedBuildId) write(BUILD_ID_KEY, servedBuildId);
        },

        dismiss: () => {
            // Persisted, because a declining tap does not make the tab any less
            // stale — the next foreground check would find the same build and
            // re-offer it, and a till that never reloads would be asked all
            // shift. Clearing the state as well re-arms the check for whatever
            // ships next.
            if (servedBuildId) {
                write(DECLINED_KEY, servedBuildId);
                setServedBuildId(null);
                return;
            }
            // Nothing to persist: the new id was written at mount, so this only
            // has to stop showing for the rest of this page's life.
            setJustUpdated(false);
        },
    };
}
