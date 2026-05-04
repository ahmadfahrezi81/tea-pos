"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { MapPin, StoreIcon, Building2, ChevronRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { useStore } from "@/lib/context/StoreContext";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";
import { navigation } from "@tea-pos/utils/navigation";
import { CustomerFeedbackDrawer } from "./CustomerFeedbackDrawer";

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
        className={`w-full flex items-center gap-1 py-4 border-b border-gray-100 last:border-none text-left ${
            disabled ? "opacity-40 cursor-default" : "active:bg-gray-50"
        }`}
    >
        <span className="text-xl w-6 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
            <p className="text-base text-gray-800">{label}</p>
            {sublabel && (
                <p className="text-xs text-gray-500 truncate">{sublabel}</p>
            )}
        </div>
        {right ?? (
            !disabled && (
                <ChevronRight
                    size={20}
                    strokeWidth={2.5}
                    className="text-brand/90"
                />
            )
        )}
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
    const { profile } = useAuth();
    const { selectedStore, assignedStores, setIsPickerOpen } = useStore();
    const { fastOrderMode, toggleFastOrderMode } = useFastOrderMode();

    const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);

    if (!profile) return null;

    return (
        <div className="min-h-screen space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Quick Settings
            </h3>
            <div className="bg-white rounded-xl p-4 py-1 space-y-1 shadow-sm">
                <SettingsRow
                    icon={<Icon icon="fluent-emoji:rocket" width="20" height="20" />}
                    label="Fast Order Mode"
                    sublabel="Faster POS experience"
                    onClick={toggleFastOrderMode}
                    right={<FastOrderToggle enabled={fastOrderMode} />}
                />
                {assignedStores.length > 0 && (
                    <SettingsRow
                        icon={<StoreIcon size={20} className="text-gray-900" />}
                        label="Your Store"
                        sublabel={selectedStore?.name}
                        onClick={
                            assignedStores.length > 1
                                ? () => setIsPickerOpen(true)
                                : undefined
                        }
                        disabled={assignedStores.length === 1}
                    />
                )}
                <SettingsRow
                    icon={<Building2 size={20} className="text-gray-900" />}
                    label="Assigned Stores"
                    sublabel={`You're assigned in ${assignedStores.length} ${assignedStores.length !== 1 ? "stores" : "store"}`}
                    onClick={() => navigation.push(url("/mobile/profile/stores"))}
                />
                <SettingsRow
                    icon={<MapPin size={20} className="text-gray-900" />}
                    label="Customer Feedback"
                    sublabel="Log feedback with a location"
                    onClick={() => setShowFeedbackDrawer(true)}
                />
            </div>

            <CustomerFeedbackDrawer
                isOpen={showFeedbackDrawer}
                onClose={() => setShowFeedbackDrawer(false)}
            />
        </div>
    );
}
