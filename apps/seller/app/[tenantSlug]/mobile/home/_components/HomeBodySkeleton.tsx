"use client";

import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

/**
 * The header block — greeting, date, switcher, timeline — as a placeholder.
 *
 * Its text needs no data, so it could be rendered for real. It is not, because
 * the whole region above the fold arriving in two pieces reads worse than it
 * arriving in one: a live header over a skeleton body looks like the body
 * failed. Padding matches `AtAGlance` so the swap moves nothing.
 */
export function HomeHeaderSkeleton() {
    return (
        <div className="overflow-visible">
            <div className="pb-3 flex items-start justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-40 rounded" />
                    <Skeleton delay={60} className="h-4 w-44 rounded" />
                </div>
                <Skeleton delay={120} className="h-9 w-36 rounded-xl shrink-0" />
            </div>

            <div className="px-4 py-4 pb-8">
                <div className="flex items-center gap-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            delay={180 + i * 50}
                            className="flex-1 h-4 rounded-full"
                        />
                    ))}
                </div>
                <div className="flex items-center gap-1 mt-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex-1 flex justify-start">
                            <Skeleton delay={180 + i * 50} className="h-2 w-5 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * The home body while the session gate is still resolving.
 *
 * Deliberately neutral. Which screen follows — POS, the manage list, or one of
 * the gate cards — is exactly what the pending read decides, so a placeholder
 * shaped like any one of them is a guess that is loudly wrong the rest of the
 * time. What all four share is a white card filling the region, so that is what
 * this draws: the frame is honest, and only the contents are unknown.
 *
 * Not a bare rectangle, though. It carries the centred icon-and-lines block the
 * gate cards use, because a featureless slab says "wait" where a shape says
 * "something is coming".
 */
export function GateSkeleton() {
    return (
        <div className="bg-white rounded-2xl w-full min-h-full flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-xs flex flex-col items-center">
                <Skeleton className="w-[100px] h-[100px] rounded-2xl mb-5" />
                <Skeleton delay={60} className="h-4 w-24 rounded" />
                <Skeleton delay={120} className="h-7 w-44 rounded mt-3" />
                <Skeleton delay={180} className="h-4 w-56 rounded mt-3" />
            </div>
        </div>
    );
}

/**
 * The product grid before products arrive. POS owns the moment this is right —
 * once the gate has said `open` — so it is the only caller.
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                    <div className="p-3">
                        <div className="flex gap-2 mb-3">
                            <Skeleton
                                delay={i * 90}
                                className="shrink-0 w-[50px] h-[50px] rounded"
                            />
                            <div className="flex-1 space-y-2 pt-1">
                                <Skeleton delay={i * 90 + 60} className="h-4 w-3/4 rounded" />
                                <Skeleton delay={i * 90 + 120} className="h-4 w-1/2 rounded" />
                            </div>
                        </div>
                        <Skeleton delay={i * 90 + 180} className="h-8 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}
