"use client";

import { FooterSlot } from "@tea-pos/shell/FooterSlotContext";
import { ActionButton } from "@tea-pos/ui/custom/ActionButton";

const VARIANT_CLASS = {
    brand: "bg-brand",
    green: "bg-green-600",
    orange: "bg-orange-500",
} as const;

interface FormFooterProps {
    label: string;
    loadingLabel?: string;
    onSubmit: () => void | boolean | Promise<unknown>;
    disabled?: boolean;
    isLoading?: boolean;
    /** Where a failing submit goes. Without it the rejection is re-thrown. */
    onError?: (error: unknown) => void;
    /**
     * Release the button when the submit succeeds. Off by default: most of these
     * screens navigate away, and a button released during that gap is a second
     * submit waiting to happen. Pass it where the screen stays.
     */
    resetOnSuccess?: boolean;
    variant?: keyof typeof VARIANT_CLASS;
}

export function FormFooter({
    label,
    loadingLabel,
    onSubmit,
    disabled = false,
    isLoading = false,
    variant = "brand",
    onError,
    resetOnSuccess = false,
}: FormFooterProps) {
    return (
        <FooterSlot>
            <div className="bg-white border-t border-gray-200 p-4">
                <ActionButton
                    action={onSubmit}
                    onError={onError}
                    resetOnSuccess={resetOnSuccess}
                    busyLabel={loadingLabel ?? label}
                    disabled={disabled || isLoading}
                    className={`w-full ${VARIANT_CLASS[variant]} text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
                >
                    {label}
                </ActionButton>
            </div>
        </FooterSlot>
    );
}
