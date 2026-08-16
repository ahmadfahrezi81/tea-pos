"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A record in a list — a staff member, a claim config, a payout.
 *
 * Deliberately a sibling of `SettingsRow` rather than a variant of it: the
 * metrics are shared (same height, padding, divider and card) so the two read
 * as one system, but the content model is different. A settings row is one
 * label and an action; this is a record with an identity, a detail line, and
 * whatever status the screen needs on the right.
 *
 * Renders a `<button>` only when `onClick` is given. Rows whose trailing slot
 * holds its own button — an edit pencil, a toggle — must stay a `<div>`, since
 * nesting buttons is invalid HTML and swallows the inner click.
 */
interface ListRowProps {
    /** Avatar, initial, or icon. Omit for rows that lead with their title. */
    leading?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Replaces the trailing chevron. Pass a status, a value, or its own button. */
    trailing?: ReactNode;
    onClick?: () => void;
}

export function ListRow({ leading, title, subtitle, trailing, onClick }: ListRowProps) {
    const body = (
        <>
            {leading && (
                <span className="shrink-0 flex items-center py-4">{leading}</span>
            )}
            <div className="flex-1 min-w-0 flex items-center gap-3 py-4 -mr-4 pr-4 border-b-2 border-slate-100 group-last:border-b-0">
                <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-medium text-gray-900 truncate">{title}</p>
                    {subtitle && (
                        <p className="text-sm text-gray-400 truncate">{subtitle}</p>
                    )}
                </div>
                {trailing ??
                    (onClick && (
                        <ChevronRight
                            size={20}
                            strokeWidth={2.5}
                            className="text-brand/90 shrink-0"
                        />
                    ))}
            </div>
        </>
    );

    const className = `group w-full flex items-stretch gap-3 text-left ${
        onClick ? "active:bg-gray-50" : ""
    }`;

    return onClick ? (
        <button onClick={onClick} className={className}>
            {body}
        </button>
    ) : (
        <div className={className}>{body}</div>
    );
}

/**
 * The card `ListRow`s sit in — same shape as `SettingsGroup`'s, without the
 * heading, since these lists carry their title in the page header instead.
 */
export function ListCard({ children }: { children: ReactNode }) {
    return <div className="bg-white rounded-2xl px-4 py-1">{children}</div>;
}

/** Placeholder rows at the same height, so the list does not jump on load. */
export function ListRowSkeleton({ withLeading = false }: { withLeading?: boolean }) {
    return (
        <div className="group w-full flex items-stretch gap-3">
            {withLeading && (
                <span className="shrink-0 flex items-center py-4">
                    <span className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse" />
                </span>
            )}
            <div className="flex-1 py-4 -mr-4 pr-4 border-b-2 border-slate-100 group-last:border-b-0 space-y-1.5">
                <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
        </div>
    );
}
