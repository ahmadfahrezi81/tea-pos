"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X, Info } from "lucide-react";
import { useServiceWorkerUpdate } from "@tea-pos/shell/useServiceWorkerUpdate";

const INACTIVITY_LIMIT = 1000 * 60 * 15; // 15 minutes

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

export default function InactivityRefreshPopup() {
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
        <>
            <div className="fixed inset-0 z-40" onClick={handleDismiss} />
            <div className="fixed bottom-8 right-4 z-50">
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-lg relative w-[280px] sm:w-[320px]" onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleDismiss} className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-gray-100">
                        <X size={18} />
                    </button>
                    <div className="flex items-start space-x-2">
                        <Info className="text-blue-500 mt-0.5" size={18} />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                            <p className="text-xs text-gray-600">{body}</p>
                            <button
                                onClick={() => { setIsRefreshing(true); window.location.reload(); }}
                                disabled={isRefreshing}
                                className="mt-2 flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                            >
                                <RefreshCw size={14} className={`mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                                {isRefreshing ? "Refreshing..." : "Refresh Now"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
