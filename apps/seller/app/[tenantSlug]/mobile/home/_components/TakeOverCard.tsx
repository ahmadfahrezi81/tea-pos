"use client";

import { useState } from "react";
import { Loader2, UserCircle } from "lucide-react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useT } from "@/lib/hooks/useT";

export function TakeOverCard({
    onTransfer,
    userName,
    userAvatarUrl,
}: {
    onTransfer: (code: string) => Promise<unknown>;
    userName?: string | null;
    userAvatarUrl?: string | null;
}) {
    const [claimCode, setClaimCode] = useState("");
    const [transferError, setTransferError] = useState<string | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const t = useT();

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
        <div className="text-center w-full max-w-xs mx-auto">
            <Icon icon="fluent-emoji:locked-with-key" width={100} height={100} className="mx-auto mb-5" />
            <p className="font-bold text-gray-900 text-2xl tracking-tight">{t("home.takeover.takenBy")}</p>
            {userName && (
                <div className="flex items-center gap-2 mt-1 justify-center bg-slate-100 rounded-xl px-2 py-2 pr-4 w-fit mx-auto">
                    {userAvatarUrl ? (
                        <Image
                            src={userAvatarUrl}
                            alt={userName}
                            width={28}
                            height={28}
                            className="rounded-lg object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                            <UserCircle size={18} className="text-brand" />
                        </div>
                    )}
                    <p className="text-lg font-bold text-gray-900 truncate">{userName}</p>
                </div>
            )}
            <p className="text-base text-gray-500 mt-4 mb-7">
                {t("home.takeover.askCode")}
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
                <p className="text-sm text-red-500 mb-3">{transferError}</p>
            )}
            <button
                onClick={handleTakeOver}
                disabled={claimCode.length !== 2 || isTransferring}
                className="w-full bg-brand text-white py-4 rounded-xl font-bold text-base active:scale-95 transition-transform disabled:opacity-40"
            >
                {isTransferring ? (
                    <Loader2 size={18} className="animate-spin mx-auto" />
                ) : (
                    t("home.takeover.takeOver")
                )}
            </button>
        </div>
    );
}
