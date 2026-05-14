"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Loader2 } from "lucide-react";

export default function OpenStorePage() {
    const { selectedStoreId, selectedStore } = useStore();
    const { url } = useTenantSlug();
    const { openStore } = useSession(selectedStoreId);

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedStoreId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await openStore({ date: todayStr, openingBalance });
            navigation.push(url("/mobile/home/manage"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to open store");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Store</p>
                    <p className="font-semibold text-gray-800 mt-0.5">
                        {selectedStore?.name ?? "Unknown Store"}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date</p>
                    <p className="font-semibold text-gray-800 mt-0.5">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                        Opening Balance
                    </span>
                    <span className="text-xs text-gray-400 ml-1">(optional)</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1000}
                        value={openingBalance || ""}
                        onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none text-lg"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Cash on hand at the start of the day</p>
                </label>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedStoreId}
                className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Opening...
                    </>
                ) : (
                    "Open Store"
                )}
            </button>
        </div>
    );
}
