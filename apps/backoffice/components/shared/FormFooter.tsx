"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Icon } from "@iconify/react";
import { FooterSlot } from "@tea-pos/shell/FooterSlotContext";
import { ActionButton } from "@tea-pos/ui/custom/ActionButton";
import { DOT_GRID } from "@tea-pos/ui/styles/dot-grid";
import "@tea-pos/ui/icons/bundled-emoji";

const VARIANT_CLASS = {
    brand: "bg-brand",
    green: "bg-green-600",
    orange: "bg-orange-500",
    gray: "bg-gray-700",
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
    /** When set, tapping the button opens a confirm bottom sheet instead of submitting directly. */
    confirmTitle?: string;
    confirmMessage?: string;
    /** Replaces the configuration warning for footers that confirm something else. */
    confirmNote?: { title: string; body: string };
    /** Iconify name for the sheet's artwork. Must be registered in bundled-emoji. */
    confirmIcon?: string;
}

/* Most screens behind this footer edit payroll configuration, and none of that
   is retroactive — the warning is the same sentence each time, so it is written
   once here rather than passed in five times and drifting. Screens that confirm
   something else pass their own note. */
const CONFIG_NOTE = {
    title: "What this changes",
    body: "Payroll already recorded stays as it is. This applies from here on, to days closed and claims submitted after you save.",
};

export function FormFooter({
    label, loadingLabel, onSubmit,
    disabled = false, isLoading = false, variant = "brand",
    onError, resetOnSuccess = false,
    confirmTitle, confirmMessage,
    confirmNote = CONFIG_NOTE,
    confirmIcon = "fluent-emoji:floppy-disk",
}: FormFooterProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const requiresConfirm = Boolean(confirmTitle || confirmMessage);

    return (
        <>
            <FooterSlot>
                <div className="bg-white border-t border-gray-200 p-4 pb-8">
                    <ActionButton
                        /* Opening the confirm sheet sends nothing, so `false`
                           releases the button rather than leaving it spinning
                           behind the sheet. */
                        action={() => {
                            if (requiresConfirm) {
                                setConfirmOpen(true);
                                return false;
                            }
                            return onSubmit();
                        }}
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

            {requiresConfirm && confirmOpen && (
                /* Same sheet as the app's refresh prompt — pull tab, dotted
                   plate, one note, one button and a way out. A confirm is the
                   same kind of interruption, so it should not look like a
                   different app. The close cross is gone with it: the overlay,
                   Cancel and the tab all dismiss, and a fourth way out only
                   crowded the title. */
                <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setConfirmOpen(false)}>
                    <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-gray-300" />
                        </div>

                        <div className="relative -mx-5 flex justify-center py-3">
                            <div aria-hidden className="pointer-events-none absolute inset-0" style={DOT_GRID} />
                            <Icon icon={confirmIcon} width={88} height={88} className="relative" />
                        </div>

                        <div className="space-y-1 text-center">
                            <p className="text-xl font-bold text-gray-900">{confirmTitle ?? "Are you sure?"}</p>
                            {confirmMessage && <p className="text-sm text-gray-600">{confirmMessage}</p>}
                        </div>

                        <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 text-left">
                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <Info size={18} className="text-blue-500" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-gray-900">{confirmNote.title}</p>
                                <p className="text-sm text-gray-500">{confirmNote.body}</p>
                            </div>
                        </div>

                        <ActionButton
                            action={() => { setConfirmOpen(false); onSubmit(); }}
                            /* The sheet closes itself, so this instance goes
                               with it; nothing is left holding a latch. */
                            resetOnSuccess
                            busyLabel={loadingLabel ?? label}
                            disabled={isLoading}
                            className={`w-full py-3.5 font-bold rounded-xl text-white active:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2 ${VARIANT_CLASS[variant]}`}
                        >
                            {label}
                        </ActionButton>
                        <button onClick={() => setConfirmOpen(false)} className="w-full py-3 text-gray-500 text-sm font-medium">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
