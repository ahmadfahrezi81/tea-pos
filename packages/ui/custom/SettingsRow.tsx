"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The building blocks of a "More" screen. Every app in the suite has one, and
 * the rows differ only in destination and label — so the chrome lives here and
 * the callers own the content. Labels arrive as display strings: this package
 * has no i18n, and one of the two apps has none either.
 */

interface SettingsRowProps {
    icon: ReactNode;
    label: string;
    sublabel?: string;
    onClick?: () => void;
    disabled?: boolean;
    /** Replaces the trailing chevron — a toggle, a badge, a value. */
    right?: ReactNode;
}

export function SettingsRow({
    icon,
    label,
    sublabel,
    onClick,
    disabled = false,
    right,
}: SettingsRowProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`group w-full flex items-stretch gap-3 text-left ${
                disabled ? "opacity-40 cursor-default" : "active:bg-gray-50"
            }`}
        >
            <span className="text-xl w-6 text-center shrink-0 flex items-center py-5">{icon}</span>
            <div className="flex-1 flex items-center py-5 -mr-4 pr-4 border-b-2 border-slate-100 group-last:border-b-0">
                <p className="flex-1 text-[17px] font-medium text-gray-800">{label}</p>
                {sublabel && <p className="text-xs text-gray-500 truncate">{sublabel}</p>}
                {right ??
                    (!disabled && (
                        <ChevronRight size={20} strokeWidth={2.5} className="text-brand/90" />
                    ))}
            </div>
        </button>
    );
}

interface SettingsGroupProps {
    title: string;
    children: ReactNode;
}

/** A titled card of `SettingsRow`s — the divider between rows comes from the row itself. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
    return (
        <section className="space-y-2">
            <p className="pl-3 text-xs font-bold uppercase tracking-widest text-gray-700">{title}</p>
            <div className="bg-white rounded-2xl px-4 py-1">{children}</div>
        </section>
    );
}
