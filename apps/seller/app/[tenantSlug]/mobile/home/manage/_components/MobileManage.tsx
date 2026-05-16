"use client";

import { useState } from "react";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useToast } from "@/lib/context/ToastContext";
import { WeatherButton } from "../../pos/_components/WeatherButton";
import { WeatherDrawer } from "../../pos/_components/WeatherDrawer";
import { ChevronRight, DollarSign, XCircle } from "lucide-react";

function formatSessionTime(startedAt: string): string {
    const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
    const local = new Date(new Date(startedAt).getTime() + tz * 3600000);
    return local.toISOString().slice(11, 16);
}

export default function MobileManage() {
    const { url } = useTenantSlug();
    const { selectedStoreId } = useStore();
    const { gate, session } = useSession(selectedStoreId);
    const { showToast } = useToast();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);

    const handleCopyCode = async () => {
        if (!session?.claimCode) return;
        try {
            await navigator.clipboard.writeText(session.claimCode);
            showToast("Code copied", "success");
        } catch {
            showToast("Failed to copy", "error");
        }
    };

    const isStoreNotOpen = gate === "no_summary" || gate === "no_session";
    const isClosed = gate === "closed";
    const dimmed = isStoreNotOpen || isClosed;

    return (
        <div className="flex flex-col gap-4 pb-24">
            {/* Top card: weather + session code */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                {/* Left — weather */}
                <div className="flex-1 flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-800">Weather Forecast</p>
                        <p className="text-xs text-gray-500 mt-0.5">Check today&apos;s forecast</p>
                    </div>
                    <WeatherButton onClick={() => setIsWeatherOpen(true)} />
                </div>

                {/* Divider */}
                <div className="w-px self-stretch bg-gray-100" />

                {/* Right — session code */}
                {gate === "open" && session ? (
                    <button
                        onClick={handleCopyCode}
                        className="flex flex-col items-end gap-0.5 active:opacity-70 transition-opacity min-w-[64px]"
                    >
                        <span className="text-2xl font-bold font-mono tracking-widest text-gray-900">
                            {session.claimCode}
                        </span>
                        <span className="text-xs text-gray-400">
                            Since {formatSessionTime(session.startedAt)}
                        </span>
                    </button>
                ) : (
                    <span className="text-gray-300 font-medium text-lg min-w-[64px] text-right">—</span>
                )}
            </div>

            {/* Store actions */}
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                <ActionRow
                    icon={<DollarSign size={20} className={dimmed ? "text-gray-400" : "text-blue-600"} />}
                    label="Add Expenses"
                    sublabel={dimmed ? "Open store first" : "Log costs for today"}
                    onClick={() => navigation.push(url("/mobile/home/manage/expense"))}
                    disabled={dimmed}
                />
                <ActionRow
                    icon={<XCircle size={20} className={dimmed ? "text-gray-400" : "text-red-500"} />}
                    label="Close Day"
                    sublabel={dimmed ? "Open store first" : "Count cash and finalize"}
                    onClick={() => navigation.push(url("/mobile/home/manage/close"))}
                    danger={!dimmed}
                    disabled={dimmed}
                />
            </div>

            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
            />
        </div>
    );
}

function ActionRow({
    icon,
    label,
    sublabel,
    onClick,
    highlight = false,
    danger = false,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick: () => void;
    highlight?: boolean;
    danger?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-3 p-4 text-left transition-colors
                ${highlight ? "bg-green-50 active:bg-green-100" : "active:bg-gray-50"}
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
        >
            <span className="shrink-0">{icon}</span>
            <div className="flex-1">
                <p className={`font-medium ${danger ? "text-red-600" : highlight ? "text-green-700" : "text-gray-800"}`}>
                    {label}
                </p>
                {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </button>
    );
}
