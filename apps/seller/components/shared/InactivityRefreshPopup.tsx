"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Info } from "lucide-react";
import { useServiceWorkerUpdate } from "@tea-pos/shell/useServiceWorkerUpdate";

const INACTIVITY_LIMIT = 1000 * 60 * 20; // 20 minutes

/**
 * Two reasons to suggest a reload, one prompt. A second, independent popup
 * racing this one would be worse than either alone, and this component already
 * solves the hard part — deciding when interrupting is acceptable.
 */
const COPY = {
    update: {
        title: "Update Available",
        body: "A new version is ready. Refresh to load it.",
    },
    inactivity: {
        title: "Refresh Required",
        body: "You've been inactive — refresh to avoid stale data.",
    },
} as const;

/**
 * pointerdown covers mouse, touch and pen in one event, so a tap or the start
 * of a scroll gesture counts as activity on a phone — mousemove and keydown
 * alone never fire there, which meant the prompt appeared on a timer no matter
 * how busy the user was. mousemove stays for desktop hovering without a click.
 */
const ACTIVITY_EVENTS = ["pointerdown", "mousemove", "keydown"] as const;

export default function RefreshOnStaleData() {
    const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasUpdate = useServiceWorkerUpdate();
    const [updateDismissed, setUpdateDismissed] = useState(false);
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
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // A pending update is the more actionable of the two, so it wins the copy
    // when both are true.
    const reason =
        hasUpdate && !updateDismissed ? "update"
        : showInactivityPrompt ? "inactivity"
        : null;

    const handleRefresh = () => {
        setIsRefreshing(true);
        window.location.reload();
    };

    // Dismissing the inactivity prompt works because the tap itself bubbles to
    // the window `pointerdown` listener above and counts as activity, so the
    // interval does not immediately re-raise it. An update has no such natural
    // reset — it stays pending until the user reloads — so it is latched off
    // explicitly.
    const handleDismiss = () => {
        if (reason === "update") setUpdateDismissed(true);
        else setShowInactivityPrompt(false);
    };

    if (!reason) return null;
    const { title, body } = COPY[reason];

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={handleDismiss}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <div className="w-8 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Info size={20} className="text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-gray-900">{title}</p>
                        <p className="text-sm text-gray-600">{body}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-60"
                    >
                        <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                        {isRefreshing ? "Refreshing..." : "Refresh Now"}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 rounded-xl text-gray-500 text-sm font-medium active:bg-gray-50"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
