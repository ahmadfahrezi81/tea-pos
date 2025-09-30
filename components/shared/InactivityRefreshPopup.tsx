"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X, Info } from "lucide-react";

const INACTIVITY_LIMIT = 1000 * 60 * 15; // 15 minutes

export default function RefreshOnStaleData() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Track user activity
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

    // Inactivity checker
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > INACTIVITY_LIMIT) {
                setShowPrompt(true);
            }
        }, 1000); // check every second

        return () => clearInterval(interval);
    }, [lastActivity]);

    const handleRefresh = () => window.location.reload();
    const handleDismiss = () => setShowPrompt(false);

    if (!showPrompt) return null;

    return (
        <>
            {/* Background click closes popup */}
            <div className="fixed inset-0 z-40" onClick={handleDismiss} />

            <div className="fixed bottom-4 right-4 z-50">
                <div
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-lg relative w-[280px] sm:w-[320px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleDismiss}
                        className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-gray-100"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-start space-x-2">
                        <Info className="text-blue-500 mt-0.5" size={18} />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                                Refresh Required
                            </h3>
                            <p className="text-xs text-gray-600">
                                You&apos;ve been inactive — refresh to avoid
                                stale data.
                            </p>
                            <button
                                onClick={handleRefresh}
                                className="mt-2 flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                            >
                                <RefreshCw size={14} className="mr-1" />
                                Refresh Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
