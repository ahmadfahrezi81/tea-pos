"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * A Notion-style callout: an icon in the gutter, an optional heading, and the
 * thing being said.
 *
 * One neutral surface rather than a palette per severity. A screen that paints
 * its warnings amber and its notes grey teaches the reader to skim the grey
 * ones, and most of what these carry is a consequence worth reading either way
 * — the icon says which kind it is, and it says so faster than a background
 * colour does.
 *
 * `bg-slate-50` with a border is the one surface that survives both places this
 * appears: lighter than the app's slate page background, darker than the white
 * cards, legible on either without a variant.
 */
export function Callout({
    icon = <AlertTriangle size={18} className="text-amber-600" />,
    title,
    children,
}: {
    icon?: ReactNode;
    title?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0 space-y-0.5">
                {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
                <p className="text-sm text-slate-600">{children}</p>
            </div>
        </div>
    );
}
