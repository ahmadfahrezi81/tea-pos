"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AtAGlance } from "./_components/AtAGlance";
import { TakeOverCard } from "./_components/TakeOverCard";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import { useStoreActivityLogs } from "@/lib/hooks/activity-logs/useStoreActivityLogs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Icon } from "@iconify/react";
import { useMobileOverlay } from "../components/MobileOverlayContext";

function GateIcon({ icon }: { icon: string }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="relative w-[100px] h-[100px] mx-auto mb-5">
            {!loaded && <div className="absolute inset-0 rounded-2xl bg-gray-200" />}
            <Icon icon={icon} width={100} height={100} className="absolute inset-0" onLoad={() => setLoaded(true)} />
        </div>
    );
}

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
    const { url } = useTenantSlug();

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
            <div className="bg-white rounded-3xl w-full h-full flex flex-col items-center justify-center p-8">
                {isPosInUse ? (
                    <TakeOverCard onTransfer={transferSession} />
                ) : gate === "closed" ? (
                    <div className="text-center w-full max-w-xs">
                        <GateIcon icon="fluent-emoji:alarm-clock" />
                        <p className="font-bold text-gray-900 text-2xl tracking-tight">Store is closed</p>
                        <p className="text-base text-gray-500 mt-2">
                            Today&apos;s session has ended.
                        </p>
                    </div>
                ) : (
                    <div className="text-center w-full max-w-xs">
                        <GateIcon icon="fluent-emoji:convenience-store" />
                        <p className="font-bold text-gray-900 text-2xl tracking-tight">Store not open yet</p>
                        <p className="text-base text-gray-500 mt-2 mb-7">
                            Open the store to start taking orders today.
                        </p>
                        <button
                            onClick={() => navigation.push(url("/mobile/home/manage/open"))}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base active:scale-95 transition-transform"
                        >
                            Open Store
                        </button>
                    </div>
                )}
            </div>
        );
    }, [showGate, isPosInUse, gate, transferSession, url]);

    useLayoutEffect(() => {
        setOverlay(gateContent);
        return () => setOverlay(null);
    }, [gateContent, setOverlay]);

    if (showGate) return null;

    return (
        <div className="flex flex-col gap-4">
            {isHomeRoot && (
                <AtAGlance
                    openTime={selectedStore?.openTime}
                    closeTime={selectedStore?.closeTime}
                    events={events}
                />
            )}
            <div
                key={pathname}
                className="animate-in fade-in duration-150 ease-out"
            >
                {children}
            </div>
        </div>
    );
}
