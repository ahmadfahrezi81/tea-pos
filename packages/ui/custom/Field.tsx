"use client";

import type { ReactNode } from "react";

interface FieldProps {
    label: ReactNode;
    /**
     * Marks the field with a red asterisk. It must reflect what the screen
     * actually enforces — a marker that disagrees with the submit button
     * teaches the reader to ignore it.
     */
    required?: boolean;
    children: ReactNode;
}

/**
 * A labelled form field: the label, the gap, and whatever control the screen
 * puts under it.
 *
 * A wrapper rather than a `label` prop on each input, for two reasons. The
 * label sits above six different controls, so a prop would mean six
 * implementations of the same thing. And some fields swap their control by
 * state — the claim date is a skeleton, then a message, then a select, then a
 * read-only box, all under one label — which a wrapper spans and a prop cannot.
 *
 * The label is a <p>, not a <label>: TextInput and NumberInput already render
 * their own <label> shell, and nesting the two is invalid HTML.
 */
export function Field({ label, required, children }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </p>
            {children}
        </div>
    );
}
