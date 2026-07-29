"use client";

import { useLayoutEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useFooterSlot } from "@tea-pos/shell/FooterSlotContext";

const VARIANT_CLASS = {
    brand: "bg-brand",
    green: "bg-green-600",
    orange: "bg-orange-500",
} as const;

interface FormFooterProps {
    label: string;
    loadingLabel?: string;
    onSubmit: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    variant?: keyof typeof VARIANT_CLASS;
    /** When set, tapping the button opens a confirm bottom sheet instead of submitting directly. */
    confirmTitle?: string;
    confirmMessage?: string;
}

export function FormFooter({
    label, loadingLabel, onSubmit,
    disabled = false, isLoading = false, variant = "brand",
    confirmTitle, confirmMessage,
}: FormFooterProps) {
    const { setFooterSlot } = useFooterSlot();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const requiresConfirm = Boolean(confirmTitle || confirmMessage);

    useLayoutEffect(() => {
        setFooterSlot(
            <div className="bg-white border-t border-gray-200 p-4 pb-8">
                <button
                    type="button"
                    onClick={() => (requiresConfirm ? setConfirmOpen(true) : onSubmit())}
                    disabled={disabled || isLoading}
                    className={`w-full ${VARIANT_CLASS[variant]} text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
                >
                    {isLoading ? <><Loader2 size={18} className="animate-spin" />{loadingLabel ?? label}</> : label}
                </button>
            </div>
        );
        return () => setFooterSlot(null);
    }, [label, loadingLabel, onSubmit, disabled, isLoading, variant, setFooterSlot, requiresConfirm]);

    if (!requiresConfirm || !confirmOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setConfirmOpen(false)}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">{confirmTitle ?? "Are you sure?"}</p>
                    <button onClick={() => setConfirmOpen(false)}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                {confirmMessage && <p className="text-sm text-gray-500">{confirmMessage}</p>}
                <button
                    onClick={() => { setConfirmOpen(false); onSubmit(); }}
                    disabled={isLoading}
                    className={`w-full py-3.5 font-bold rounded-xl text-white active:opacity-80 disabled:opacity-40 ${VARIANT_CLASS[variant]}`}
                >
                    {isLoading ? (loadingLabel ?? label) : label}
                </button>
                <button onClick={() => setConfirmOpen(false)} className="w-full py-3 text-gray-500 text-sm font-medium">
                    Cancel
                </button>
            </div>
        </div>
    );
}
