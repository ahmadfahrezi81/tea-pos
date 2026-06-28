"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X, Info } from "lucide-react";

const INACTIVITY_LIMIT = 1000 * 60 * 15; // 15 minutes

export default function InactivityRefreshPopup() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const updateActivity = () => setLastActivity(Date.now());
        window.addEventListener("mousemove", updateActivity);
        window.addEventListener("keydown", updateActivity);
        return () => {
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("keydown", updateActivity);
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastActivity > INACTIVITY_LIMIT) setShowPrompt(true);
        }, 1000);
        return () => clearInterval(interval);
    }, [lastActivity]);

    if (!showPrompt) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPrompt(false)} />
            <div className="fixed bottom-8 right-4 z-50">
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-lg relative w-[280px] sm:w-[320px]" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setShowPrompt(false)} className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-gray-100">
                        <X size={18} />
                    </button>
                    <div className="flex items-start space-x-2">
                        <Info className="text-blue-500 mt-0.5" size={18} />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Refresh Required</h3>
                            <p className="text-xs text-gray-600">You&apos;ve been inactive — refresh to avoid stale data.</p>
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
