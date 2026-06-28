"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AtAGlance } from "./_components/AtAGlance";
import { StoreGate } from "./_components/StoreGate";
import { TakeOverCard } from "./_components/TakeOverCard";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import { useStoreActivityLogs } from "@/lib/hooks/activity-logs/useStoreActivityLogs";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isPos = pathname.endsWith("/home/pos");
    const isManage = pathname.endsWith("/home/manage");
    const isHomeRoot = isPos || isManage;

    const { selectedStoreId, selectedStore } = useStore();
    const { gate, session, summaryId, transferSession, isLoading: gateLoading } = useSession(selectedStoreId);
    const { user } = useAuth();

    const todayStr = useMemo(() => {
        const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
        return new Date(Date.now() + tz * 3600 * 1000).toISOString().slice(0, 10);
    }, []);

    const isPosInUse = isHomeRoot && gate === "open" && session?.userId !== user?.id;
    const showGate =
        isHomeRoot &&
        (gate === "no_summary" || gate === "no_session" || gate === "closed" || isPosInUse);

    if (isHomeRoot && gateLoading) return null;

    if (showGate) {
        return (
            <div className="flex flex-col h-full gap-4">
                <AtAGlance summaryId={summaryId ?? undefined} />
                <div className="flex-1 min-h-0">
                    <StoreGate
                        gate={gate}
                        isPosInUse={isPosInUse}
                        onTransfer={transferSession}
                        sessionUserName={session?.userName ?? null}
                        sessionUserAvatarUrl={session?.userAvatarUrl ?? null}
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
