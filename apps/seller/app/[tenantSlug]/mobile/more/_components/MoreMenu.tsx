"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import {
    MapPin,
    Store,
    ChevronRight,
    Rocket,
    Cloud,
    Banknote,
    ReceiptText,
} from "lucide-react";
import { useStore } from "@/lib/context/StoreContext";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";
import { useFlags } from "@/lib/context/FlagsContext";
import { navigation } from "@tea-pos/utils/navigation";
import { WeatherDrawer } from "../../home/pos/_components/WeatherDrawer";
import SessionStreak from "./SessionStreak";

// ============================================================================
// SETTINGS ROW
// ============================================================================

const SettingsRow = ({
    icon,
    label,
    sublabel,
    onClick,
    disabled = false,
    right,
}: {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick?: () => void;
    disabled?: boolean;
    right?: React.ReactNode;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group w-full flex items-stretch gap-3 text-left ${
            disabled ? "opacity-40 cursor-default" : "active:bg-gray-50"
        }`}
    >
        <span className="text-xl w-6 text-center shrink-0 flex items-center py-5">{icon}</span>
        <div className="flex-1 flex items-center py-5 -mr-4 pr-4 border-b-2 border-slate-100 group-last:border-b-0">
            <p className="flex-1 text-[17px] font-medium text-gray-800">{label}</p>
            {sublabel && (
                <p className="text-xs text-gray-500 truncate">{sublabel}</p>
            )}
            {right ??
                (!disabled && (
                    <ChevronRight
                        size={20}
                        strokeWidth={2.5}
                        className="text-brand/90"
                    />
                ))}
        </div>
    </button>
);

// ============================================================================
// FAST ORDER TOGGLE — div, not button, to avoid nested <button> error
// ============================================================================

function FastOrderToggle({ enabled }: { enabled: boolean }) {
    return (
        <div
            className={`relative w-13 h-8 rounded-full transition-colors duration-200 shrink-0 pointer-events-none ${
                enabled ? "bg-rose-600" : "bg-gray-300"
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    enabled ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MoreMenu() {
    const { url } = useTenantSlug();
    const { user } = useAuth();
    const { assignedStores } = useStore();
    const { fastOrderMode, toggleFastOrderMode } = useFastOrderMode();
    const { flags: { isFastOrderEnabled } } = useFlags();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);

    if (!user) return null;

    return (
        <div className="space-y-4">
            <section className="space-y-2">
                <p className="pl-3 text-xs font-bold uppercase tracking-widest text-gray-700">Activity</p>
                <SessionStreak />
            </section>

            <section className="space-y-2">
                <p className="pl-3 text-xs font-bold uppercase tracking-widest text-gray-700">Personal</p>
                <div className="bg-white rounded-2xl px-4 py-1">
                    <SettingsRow
                        icon={<Banknote size={22} strokeWidth={2} className="text-gray-900" />}
                        label="My Pay"
                        onClick={() => navigation.push(url("/mobile/more/earnings"))}
                    />
                    <SettingsRow
                        icon={<ReceiptText size={22} strokeWidth={2} className="text-gray-900" />}
                        label="My Claims"
                        onClick={() => navigation.push(url("/mobile/more/reimbursements"))}
                    />
                    <SettingsRow
                        icon={<Store size={22} strokeWidth={2} className="text-gray-900" />}
                        label="My Stores"
                        onClick={() => navigation.push(url("/mobile/more/stores"))}
                    />
                </div>
            </section>

            <section className="space-y-2">
                <p className="pl-3 text-xs font-bold uppercase tracking-widest text-gray-700">Store</p>
                <div className="bg-white rounded-2xl px-4 py-1">
                    {isFastOrderEnabled && (
                        <SettingsRow
                            icon={<Rocket size={22} strokeWidth={2} className="text-gray-900" />}
                            label="Fast Order Mode"
                            onClick={toggleFastOrderMode}
                            right={<FastOrderToggle enabled={fastOrderMode} />}
                        />
                    )}
                    <SettingsRow
                        icon={<Cloud size={22} strokeWidth={2} className="text-gray-900" />}
                        label="Weather"
                        onClick={() => setIsWeatherOpen(true)}
                    />
                    <SettingsRow
                        icon={<MapPin size={22} strokeWidth={2} className="text-gray-900" />}
                        label="Location Feedback"
                        onClick={() => navigation.push(url("/mobile/more/map"))}
                    />
                </div>
            </section>

            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
            />
        </div>
    );
}
