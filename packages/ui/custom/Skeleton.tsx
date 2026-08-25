"use client";

import type { CSSProperties } from "react";

/**
 * A placeholder for content that has not arrived.
 *
 * The animation lives in each app's `globals.css` as `.skeleton` — a sweeping
 * highlight rather than `animate-pulse`. See the comment there for why. This
 * component owns the shape; the stylesheet owns the motion.
 *
 * **A skeleton belongs only after the shell is `ready`.** Before that the boot
 * loader is on screen and a skeleton underneath it is work nobody sees. Data
 * seeded into SWR by `BootFallback` — the store list — never needs one at all,
 * because it is in the cache at first paint.
 */
interface SkeletonProps {
    className?: string;
    /**
     * Milliseconds to offset this element's sweep. Rows in a list pass their
     * index so the highlight travels down the list instead of firing at once —
     * a synchronised flash reads as a fault, a staggered one reads as loading.
     */
    delay?: number;
    style?: CSSProperties;
}

export function Skeleton({ className = "", delay = 0, style }: SkeletonProps) {
    return (
        <div
            aria-hidden
            className={`skeleton rounded-md ${className}`}
            style={delay ? { ...style, "--skeleton-delay": `${delay}ms` } as CSSProperties : style}
        />
    );
}

/**
 * A run of text lines. The last one is short, because real paragraphs end
 * mid-line and an even block of bars looks like a table instead.
 */
export function SkeletonText({
    lines = 3,
    className = "h-3.5",
    delay = 0,
}: {
    lines?: number;
    className?: string;
    delay?: number;
}) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    delay={delay + i * 80}
                    className={`${className} ${i === lines - 1 ? "w-2/3" : "w-full"}`}
                />
            ))}
        </div>
    );
}

/**
 * One value in place, for a figure inside otherwise-real chrome.
 *
 * Inline so it sits in a line of text without breaking it, which the block
 * `Skeleton` would.
 */
export function SkeletonValue({
    loading,
    children,
    className = "h-6 w-12",
}: {
    loading: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    if (!loading) return <>{children}</>;
    return <span aria-hidden className={`skeleton inline-block rounded-md align-middle ${className}`} />;
}

/**
 * A chart's placeholder, as bars of uneven height rather than a grey slab.
 *
 * The slab-plus-spinner these replace said two things at once — "nothing here"
 * and "still working" — and neither said *a chart is coming*. Uneven heights
 * from a fixed pattern, so the shape is stable across renders instead of
 * jittering on every revalidation.
 */
const BAR_HEIGHTS = [45, 70, 35, 85, 55, 95, 40, 75, 60, 30, 80, 50];

export function SkeletonChart({ height = 220, bars = 12 }: { height?: number; bars?: number }) {
    return (
        <div
            aria-hidden
            className="flex items-end justify-between gap-1.5 px-1"
            style={{ height }}
        >
            {Array.from({ length: bars }).map((_, i) => (
                <Skeleton
                    key={i}
                    delay={i * 70}
                    className="flex-1 rounded-t-md rounded-b-sm"
                    style={{ height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}%` }}
                />
            ))}
        </div>
    );
}
