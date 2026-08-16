"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Info } from "lucide-react";
import { Icon } from "@iconify/react";
import { useAppUpdate } from "./useAppUpdate";
import { DOT_GRID } from "@tea-pos/ui/styles/dot-grid";
import "@tea-pos/ui/icons/bundled-emoji";

const INACTIVITY_LIMIT = 1000 * 60 * 20; // 20 minutes

/**
 * The threshold is twenty minutes, so second-by-second resolution buys nothing
 * and this is the only thing in the app ticking continuously on every screen.
 */
const IDLE_CHECK_MS = 1000 * 10;

/**
 * Three reasons to open this sheet, one prompt. A second, independent popup
 * racing this one would be worse than either alone, and this component already
 * solves the hard part — deciding when interrupting is acceptable.
 */
const COPY = {
    update: {
        icon: "fluent-emoji:sparkles",
        title: "Update Available",
        body: "A new version is ready. Refresh to load it.",
        info: [
            {
                title: "What you get",
                body: "The latest improvements and fixes. Refreshing takes a moment and keeps your work.",
            },
        ],
    },
    inactivity: {
        icon: "fluent-emoji:counterclockwise-arrows-button",
        title: "Refresh Required",
        body: "You've been inactive — refresh to avoid stale data.",
        info: [
            {
                title: "Why this appears",
                body: "The app has been idle for a while, so what's on screen may no longer match the server.",
            },
        ],
    },
} as const;

/**
 * Two things to say, three reasons to say them: a page that is behind and a page
 * that already picked the new build up get the identical sheet and the identical
 * button.
 *
 * The distinction is real but it is ours, not the user's — being told "you're
 * already current, nothing to do" is a worse reading than being asked to tap
 * once. Whether that tap costs a full document load is decided in
 * `handleRefresh`, out of sight.
 */
const COPY_FOR = {
    updated: "update",
    update: "update",
    inactivity: "inactivity",
} as const;

/**
 * pointerdown covers mouse, touch and pen in one event, so a tap or the start
 * of a scroll gesture counts as activity on a phone — mousemove and keydown
 * alone never fire there, which meant the prompt appeared on a timer no matter
 * how busy the user was. mousemove stays for desktop hovering without a click.
 */
const ACTIVITY_EVENTS = ["pointerdown", "mousemove", "keydown"] as const;

export default function InactivityRefreshPopup() {
    const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { reason: updateReason, markReloading, dismiss: dismissUpdate } = useAppUpdate();
    const router = useRouter();
    // A ref, not state: activity fires constantly and none of it should
    // re-render the tree. Only the interval below reads it. Seeded on mount
    // rather than here, because reading the clock during render is impure.
    const lastActivityRef = useRef(0);

    useEffect(() => {
        const markActive = () => {
            lastActivityRef.current = Date.now();
        };

        // Mounting counts as activity: the clock has to start somewhere, and
        // starting it at 0 would fire the prompt on the very first tick.
        markActive();

        ACTIVITY_EVENTS.forEach((event) =>
            window.addEventListener(event, markActive, { passive: true }),
        );

        return () => {
            ACTIVITY_EVENTS.forEach((event) =>
                window.removeEventListener(event, markActive),
            );
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
                setShowInactivityPrompt(true);
            }
        }, IDLE_CHECK_MS);

        return () => clearInterval(interval);
    }, []);

    // Anything to say about a new version outranks inactivity: engaging with
    // that sheet is itself activity, so the idle state is stale the moment it
    // appears.
    const reason = updateReason ?? (showInactivityPrompt ? "inactivity" : null);

    /**
     * One button, two reloads. A page that is behind has to fetch a new
     * document to run new code, which is `location.reload()` and costs a real
     * round trip. A page that already *is* the new build has nothing to fetch —
     * the JS in memory is current — so it only needs its server data
     * re-rendered, which `router.refresh()` does without dropping the document.
     *
     * Both read as "it refreshed" from the outside, which is the point: the
     * user should not have to know which case they are in to tap the button.
     */
    const handleRefresh = () => {
        setIsRefreshing(true);

        if (reason === "updated") {
            dismissUpdate();
            router.refresh();
            setIsRefreshing(false);
            return;
        }

        // Records the build being reloaded into, so the fresh page recognises
        // itself as current and does not open a second sheet announcing the
        // update the user just asked for. A no-op for the inactivity reason,
        // which reloads into the same build.
        markReloading();
        window.location.reload();
    };

    /**
     * One tap closes whatever is on screen, whichever reason opened it.
     *
     * Clearing the idle flag unconditionally is the fix for a real bug: the
     * interval only ever raised that flag, so twenty quiet minutes behind an
     * update sheet left it set, and dismissing the update swapped the copy to
     * the inactivity text instead of closing. Refreshing the activity stamp
     * here as well keeps the interval from re-raising it on the next tick.
     *
     * Clearing the update is guarded, though it need not be today — an update
     * outranks inactivity, so a *visible* inactivity sheet already proves none
     * is pending. That safety comes entirely from the ordering above; the guard
     * survives someone changing it. The hook owns what dismissal means for each
     * reason, because only it holds the build ids.
     */
    const handleDismiss = () => {
        if (reason === "update" || reason === "updated") dismissUpdate();
        setShowInactivityPrompt(false);
        lastActivityRef.current = Date.now();
    };

    if (!reason) return null;
    const { icon, title, body, info } = COPY[COPY_FOR[reason]];

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={handleDismiss}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <div className="w-8 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="relative -mx-5 flex justify-center py-3">
                    <div aria-hidden className="pointer-events-none absolute inset-0" style={DOT_GRID} />
                    <Icon icon={icon} width={88} height={88} className="relative" />
                </div>

                <div className="space-y-1 text-center">
                    <p className="text-xl font-bold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-600">{body}</p>
                </div>

                <div className="space-y-2">
                    {info.map((item) => (
                        <div
                            key={item.title}
                            className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 text-left"
                        >
                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <Info size={18} className="text-blue-500" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <p className="text-sm text-gray-500">{item.body}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                    <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                    {isRefreshing ? "Refreshing..." : "Refresh Now"}
                </button>
            </div>
        </div>
    );
}
