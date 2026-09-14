"use client";

import { usePathname } from "next/navigation";
import { AtAGlance } from "./_components/AtAGlance";
import { StoreGate } from "./_components/StoreGate";
import { GateSkeleton, HomeHeaderSkeleton } from "./_components/HomeBodySkeleton";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isPos = pathname.endsWith("/home/pos");
    const isManage = pathname.endsWith("/home/manage");
    const isHomeRoot = isPos || isManage;

    const { selectedStoreId } = useStore();
    const { gate, session, summaryId, transferSession, isLoading: gateLoading } = useSession(selectedStoreId);
    const { user } = useAuth();

    const isPosInUse = isHomeRoot && gate === "open" && session?.userId !== user?.id;
    const showGate =
        isHomeRoot &&
        (gate === "no_summary" || gate === "no_session" || gate === "closed" || isPosInUse);

    // Header and body both, so the region above the fold arrives as one piece.
    // Neither placeholder guesses at what follows — see GateSkeleton.
    if (isHomeRoot && gateLoading) {
        return (
            <div className="min-h-full flex flex-col gap-4">
                <HomeHeaderSkeleton />
                {/* flex-1 flex, matching the gate it stands in for. */}
                <div className="flex-1 flex">
                    <GateSkeleton />
                </div>
            </div>
        );
    }

    if (showGate) {
        return (
            // min-h-full, not h-full: when the Android keyboard shrinks the
            // viewport the gate must keep its natural height and let the shell
            // scroll, rather than being squeezed until its centred content
            // spills out over the page behind it.
            <div className="flex flex-col min-h-full gap-4">
                <AtAGlance summaryId={summaryId ?? undefined} />
                {/* flex-1 flex, and deliberately no min-h-0.
                 *
                 * min-h-0 lets a flex item shrink below its content, and with
                 * flex-1's 0% basis that is what happened: this stayed at the
                 * leftover viewport height whatever was inside it, so a gate
                 * card taller than the fold — TakeOverCard showing a transfer
                 * error, or any of them on a short phone — hung out of a parent
                 * that never grew, and the shell's scroll region had nothing to
                 * scroll to.
                 *
                 * At min-height:auto it is the larger of the free space and its
                 * own content, which is both halves of what the gate needs.
                 * `flex` is how the card claims the first half: as a flex child
                 * it stretches to this height, where the card's own min-h-full
                 * is a percentage of a height that is only definite while the
                 * card is the shorter of the two. Same look when it fits, and
                 * it grows and scrolls when it does not. */}
                <div className="flex-1 flex">
                    <StoreGate
                        gate={gate}
                        isPosInUse={isPosInUse}
                        onTransfer={transferSession}
                        sessionUserName={session?.userName ?? null}
                        sessionUserAvatarUrl={session?.userAvatarUrl ?? null}
                        sessionUserId={session?.userId ?? null}
                        summaryId={summaryId}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col gap-4">
            {isHomeRoot && (
                <AtAGlance summaryId={summaryId ?? undefined} />
            )}
            <div
                key={pathname}
                className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-150 ease-out"
            >
                {children}
            </div>
        </div>
    );
}
