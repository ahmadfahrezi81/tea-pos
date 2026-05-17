"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

export function TakeOverCard({
    onTransfer,
}: {
    onTransfer: (code: string) => Promise<unknown>;
}) {
    const [claimCode, setClaimCode] = useState("");
    const [transferError, setTransferError] = useState<string | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);

    const handleTakeOver = async () => {
        if (claimCode.length !== 2) return;
        setIsTransferring(true);
        setTransferError(null);
        try {
            await onTransfer(claimCode);
        } catch (err) {
            setTransferError(err instanceof Error ? err.message : "Invalid code");
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xs text-center mx-auto">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">POS is in use</p>
            <p className="text-sm text-gray-500 mt-1.5 mb-5">
                Ask the current seller for their 2-digit code to take over.
            </p>
            <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={claimCode}
                onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setClaimCode(v);
                    setTransferError(null);
                }}
                placeholder="––"
                className="w-20 text-center text-3xl font-bold font-mono tracking-widest border-b-2 border-gray-300 focus:border-brand focus:outline-none bg-transparent mx-auto block mb-4"
            />
            {transferError && (
                <p className="text-xs text-red-500 mb-3">{transferError}</p>
            )}
            <button
                onClick={handleTakeOver}
                disabled={claimCode.length !== 2 || isTransferring}
                className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-40"
            >
                {isTransferring ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                    "Take Over"
                )}
            </button>
        </div>
    );
}
