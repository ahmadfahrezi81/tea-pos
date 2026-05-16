"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AtAGlance } from "./_components/AtAGlance";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useStoreActivityLogs } from "@/lib/hooks/activity-logs/useStoreActivityLogs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Store, Lock } from "lucide-react";

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
    const { gate } = useSession(selectedStoreId);
    const { url } = useTenantSlug();

    const todayStr = useMemo(() => {
        const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
        return new Date(Date.now() + tz * 3600 * 1000).toISOString().slice(0, 10);
    }, []);

    const { events } = useStoreActivityLogs(selectedStoreId || undefined, todayStr);

    const showGate =
        isHomeRoot &&
        (gate === "no_summary" || gate === "no_session" || gate === "closed");

    return (
        <div className="flex flex-col gap-4 relative min-h-[70vh]">
            {/* Background — dimmed when gate is active */}
            <div className={showGate ? "opacity-50 blur-[1px] pointer-events-none select-none" : ""}>
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

            {/* Gate card — fixed center of screen */}
            {showGate && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-xs">
                        {gate === "closed" ? (
                            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock size={24} className="text-gray-400" />
                                </div>
                                <p className="font-semibold text-gray-900 text-lg">Store is closed</p>
                                <p className="text-sm text-gray-500 mt-1.5">
                                    Today&apos;s session has ended.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Store size={24} className="text-amber-500" />
                                </div>
                                <p className="font-semibold text-gray-900 text-lg">Store not open yet</p>
                                <p className="text-sm text-gray-500 mt-1.5 mb-5">
                                    Open the store to start taking orders today.
                                </p>
                                <button
                                    onClick={() => navigation.push(url("/mobile/home/manage/open"))}
                                    className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
                                >
                                    Open Store →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
