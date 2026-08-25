"use client";

import { Lock } from "lucide-react";

interface ReadOnlyInputProps {
    value: string;
    className?: string;
}

/**
 * A value the form shows but the user cannot change — a claim amount fixed by
 * its type, a date the system picked.
 *
 * It wears the same shell as TextInput and NumberInput on purpose: these sit in
 * the same column as editable fields, and a smaller, lighter box reads as a
 * different kind of thing rather than as the same thing locked. The padlock is
 * the counterpart to their pencil — same size, same weight, same corner — so
 * the two icons answer one question between them.
 */
export function ReadOnlyInput({ value, className = "text-xl font-bold" }: ReadOnlyInputProps) {
    return (
        <div className="flex items-center gap-2 p-4 px-3 border-2 border-gray-100 rounded-2xl bg-gray-50">
            <p className={`${className} text-gray-900 w-full min-w-0 truncate`}>{value}</p>
            <Lock size={20} strokeWidth={2.5} className="text-gray-400 shrink-0" />
        </div>
    );
}
