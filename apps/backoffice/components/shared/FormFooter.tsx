"use client";

import { useLayoutEffect } from "react";
import { Loader2 } from "lucide-react";
import { useMobileFooterSlot } from "@/app/[tenantSlug]/mobile/components/MobileFooterSlotContext";

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
}

export function FormFooter({
    label, loadingLabel, onSubmit,
    disabled = false, isLoading = false, variant = "brand",
}: FormFooterProps) {
    const { setFooterSlot } = useMobileFooterSlot();

    useLayoutEffect(() => {
        setFooterSlot(
            <div className="bg-white border-t border-gray-200 p-4 pb-8">
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={disabled || isLoading}
                    className={`w-full ${VARIANT_CLASS[variant]} text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
                >
                    {isLoading ? <><Loader2 size={18} className="animate-spin" />{loadingLabel ?? label}</> : label}
                </button>
            </div>
        );
        return () => setFooterSlot(null);
    }, [label, loadingLabel, onSubmit, disabled, isLoading, variant, setFooterSlot]);

    return null;
}
