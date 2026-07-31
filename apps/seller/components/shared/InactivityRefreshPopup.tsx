"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Info } from "lucide-react";

const INACTIVITY_LIMIT = 1000 * 60 * 20; // 20 minutes

/**
 * pointerdown covers mouse, touch and pen in one event, so a tap or the start
 * of a scroll gesture counts as activity on a phone — mousemove and keydown
 * alone never fire there, which meant the prompt appeared on a timer no matter
 * how busy the user was. mousemove stays for desktop hovering without a click.
 */
const ACTIVITY_EVENTS = ["pointerdown", "mousemove", "keydown"] as const;

export default function RefreshOnStaleData() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
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
                setShowPrompt(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        window.location.reload();
    };

    const handleDismiss = () => setShowPrompt(false);

    if (!showPrompt) return null;

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
                        <p className="text-lg font-bold text-gray-900">Refresh Required</p>
                        <p className="text-sm text-gray-600">
                            You&apos;ve been inactive — refresh to avoid stale data.
                        </p>
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
