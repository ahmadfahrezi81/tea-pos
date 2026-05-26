"use client";

import { useLayoutEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AtAGlance } from "./_components/AtAGlance";
import { StoreGate } from "./_components/StoreGate";
import { TakeOverCard } from "./_components/TakeOverCard";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import { useStoreActivityLogs } from "@/lib/hooks/activity-logs/useStoreActivityLogs";
import { useMobileOverlay } from "../components/MobileOverlayContext";

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
    const { gate, session, transferSession } = useSession(selectedStoreId);
    const { profile } = useAuth();

    const todayStr = useMemo(() => {
        const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
        return new Date(Date.now() + tz * 3600 * 1000).toISOString().slice(0, 10);
    }, []);

    const { events } = useStoreActivityLogs(selectedStoreId || undefined, todayStr);

    const isPosInUse = isPos && gate === "open" && session?.userId !== profile?.id;
    const showGate =
        isHomeRoot &&
        (gate === "no_summary" || gate === "no_session" || gate === "closed" || isPosInUse);

    const { setOverlay } = useMobileOverlay();

    const gateContent = useMemo(() => {
        if (!showGate) return null;
        return (
            <div className="flex flex-col h-full gap-4">
                <AtAGlance
                    openTime={selectedStore?.openTime}
                    closeTime={selectedStore?.closeTime}
                    events={events}
                />
                <div className="flex-1">
                    <StoreGate
                        gate={gate}
                        isPosInUse={isPosInUse}
                        onTransfer={transferSession}
                    />
                </div>
            </div>
        );
    }, [showGate, isPosInUse, gate, transferSession, selectedStore, events]);

    useLayoutEffect(() => {
        setOverlay(gateContent);
        return () => setOverlay(null);
    }, [gateContent, setOverlay]);

    if (showGate) return null;

    return (
        <div className="flex-1 flex flex-col gap-4">
            {isHomeRoot && (
                <AtAGlance
                    openTime={selectedStore?.openTime}
                    closeTime={selectedStore?.closeTime}
                    events={events}
                />
            )}
            <div
                key={pathname}
                className="flex-1 animate-in fade-in duration-150 ease-out"
            >
                {children}
            </div>
        </div>
    );
}
