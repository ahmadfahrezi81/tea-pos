"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Info } from "lucide-react";

const INACTIVITY_LIMIT = 1000 * 60 * 15; // 15 minutes

export default function RefreshOnStaleData() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const updateActivity = () => {
            setLastActivity(Date.now());
        };

        window.addEventListener("mousemove", updateActivity);
        window.addEventListener("keydown", updateActivity);

        return () => {
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("keydown", updateActivity);
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > INACTIVITY_LIMIT) {
                setShowPrompt(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastActivity]);

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

                <div className="flex gap-2">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 active:bg-gray-50"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-brand text-white text-sm font-semibold active:opacity-80 disabled:opacity-60"
                    >
                        <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
                        {isRefreshing ? "Refreshing..." : "Refresh Now"}
                    </button>
                </div>
            </div>
        </div>
    );
}
