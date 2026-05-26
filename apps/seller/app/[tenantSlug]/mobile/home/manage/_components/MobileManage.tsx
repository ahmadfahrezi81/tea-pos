"use client";

import { useState, useMemo } from "react";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import useWeather from "@/lib/hooks/weather/useWeather";
import { getWeatherMeta, isNightHour } from "@tea-pos/utils/weatherCode";
import { getCurrentLocalHour } from "@tea-pos/utils/time";
import { WeatherDrawer } from "../../pos/_components/WeatherDrawer";
import { ChevronRight, DollarSign, XCircle, Eye, EyeOff, Cloud, PackagePlus, AlertTriangle } from "lucide-react";

export default function MobileManage() {
    const { url } = useTenantSlug();
    const { selectedStoreId } = useStore();
    const { gate, session } = useSession(selectedStoreId);
    const { profile } = useAuth();
    const { data: weatherData } = useWeather();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);
    const [codeRevealed, setCodeRevealed] = useState(false);

    const currentLocalHour = getCurrentLocalHour();

    const WeatherIcon = useMemo(() => {
        if (!weatherData?.hourly) return null;
        const current =
            weatherData.hourly.find((h) => h.hour === currentLocalHour) ??
            weatherData.hourly[0];
        return getWeatherMeta(current.weatherCode, isNightHour(currentLocalHour)).fluentIcon;
    }, [weatherData?.hourly, currentLocalHour]);

    const isStoreNotOpen = gate === "no_summary" || gate === "no_session";
    const isClosed = gate === "closed";
    const dimmed = isStoreNotOpen || isClosed;
    const hasSession = gate === "open" && !!session;
    // Only the session owner can reveal the code
    const isOwner = hasSession && session.userId === profile?.id;

    return (
        <div className="flex flex-col gap-4 pb-24">
            {/* Top card: two equal tappable halves */}
            <div className="bg-white rounded-2xl overflow-hidden flex divide-x divide-slate-100">
                {/* Left half — claim code (owner only) */}
                {isOwner ? (
                    <button
                        onClick={() => setCodeRevealed((v) => !v)}
                        className="flex-1 flex items-center gap-3 p-4 active:bg-gray-50 transition-colors text-left"
                    >
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Claim Code</p>
                            <p className="text-2xl font-bold font-mono tracking-widest text-gray-900 mt-0.5">
                                {codeRevealed ? session.claimCode : "••"}
                            </p>
                        </div>
                        <div className="text-gray-400 shrink-0">
                            {codeRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                        </div>
                    </button>
                ) : (
                    <div className="flex-1 flex items-center gap-3 p-4">
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Claim Code</p>
                            <p className="text-lg font-medium text-gray-300 mt-0.5">—</p>
                        </div>
                    </div>
                )}

                {/* Right half — weather */}
                <button
                    onClick={() => setIsWeatherOpen(true)}
                    className="flex-1 flex items-center gap-3 p-4 active:bg-gray-50 transition-colors text-left"
                >
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                        {WeatherIcon ? (
                            <WeatherIcon width={48} height={48} />
                        ) : (
                            <Cloud size={28} className="text-blue-400" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Weather</p>
                        <p className="text-sm font-semibold text-gray-800">Forecast</p>
                    </div>
                </button>
            </div>

            {/* Store actions */}
            <div className="bg-white rounded-2xl px-4 py-1">
                <ActionRow
                    icon={<DollarSign size={22} strokeWidth={2} className={dimmed ? "text-gray-400" : "text-blue-600"} />}
                    label="Add Expenses"
                    onClick={() => navigation.push(url("/mobile/home/manage/expense"))}
                    disabled={dimmed}
                />
                <ActionRow
                    icon={<PackagePlus size={22} strokeWidth={2} className={dimmed ? "text-gray-400" : "text-emerald-600"} />}
                    label="Request Supplies"
                    onClick={() => navigation.push(url("/mobile/home/manage/request"))}
                    disabled={dimmed}
                />
                <ActionRow
                    icon={<AlertTriangle size={22} strokeWidth={2} className="text-orange-500" />}
                    label="Report Issue"
                    onClick={() => navigation.push(url("/mobile/home/manage/report"))}
                />
                <ActionRow
                    icon={<XCircle size={22} strokeWidth={2} className={dimmed ? "text-gray-400" : "text-red-500"} />}
                    label="Close Day"
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
            className={`group w-full flex items-stretch gap-3 text-left transition-colors
                ${highlight ? "bg-green-50 active:bg-green-100" : "active:bg-gray-50"}
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
        >
            <span className="shrink-0 flex items-center py-5">{icon}</span>
            <div className="flex-1 flex items-center py-5 -mr-4 pr-4 border-b-2 border-slate-100 group-last:border-b-0">
                <div className="flex-1">
                    <p className={`text-[17px] font-medium ${danger ? "text-red-600" : highlight ? "text-green-700" : "text-gray-800"}`}>
                        {label}
                    </p>
                    {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
                </div>
                <ChevronRight size={20} strokeWidth={2.5} className="text-brand/90 shrink-0" />
            </div>
        </button>
    );
}
