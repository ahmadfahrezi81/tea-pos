"use client";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@/lib/tenant-url";
import {
    Pencil,
    Bell,
    Globe,
    Wrench,
    StoreIcon,
    Leaf,
    ChevronRight,
    Building2,
    Annoyed,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { useStore } from "@/lib/context/StoreContext";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";

const SettingsRow = ({
    icon,
    label,
    sublabel,
    onClick,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick?: () => void;
    disabled?: boolean;
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
        {!disabled && (
            <ChevronRight
                size={20}
                strokeWidth={2.5}
                className="text-brand/90"
            />
        )}
    </button>
);

export default function MobileProfile() {
    const supabase = createClient();
    const router = useRouter();
    const { url } = useTenantSlug();
    const { profile } = useAuth();
    const { selectedStore, assignedStores, stores, setIsPickerOpen } =
        useStore();

    const { fastOrderMode, toggleFastOrderMode } = useFastOrderMode();

    const handleLogout = useCallback(async () => {
        const shouldLogout = window.confirm(
            "Are you sure you want to log out?",
        );
        if (shouldLogout) {
            await supabase.auth.signOut();
            router.push("/login");
        }
    }, [router, supabase]);

    const handleAdminDashboard = useCallback(() => {
        window.open(url("/admin"), "_blank", "noopener,noreferrer");
    }, [url]);

    const handleAssignedStores = useCallback(() => {
        router.push(url("/mobile/profile/stores"));
    }, [router, url]);

    if (!profile) return null;

    const isAdmin = profile.role === "ADMIN";

    const memberSince = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
          })
        : null;

    return (
        <div className="min-h-screen space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                {/* Profile Header */}
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-brand/90 flex items-center justify-center shrink-0">
                        <Annoyed size={26} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xl font-semibold text-gray-900 leading-tight truncate">
                            {profile.fullName}
                        </p>
                        <p className="text-sm text-gray-900 truncate">
                            {profile.email}
                        </p>
                        {/* {memberSince && (
                            <p className="text-xs text-gray-500">
                                Member since {memberSince}
                            </p>
                        )} */}
                    </div>
                </div>

                {/* Fast Order Mode Toggle */}
                <div className="rounded-lg p-4 flex items-center gap-3 bg-gray-50">
                    <Icon icon="fluent-emoji:rocket" width="40" height="40" />
                    <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">
                            Fast Order Mode
                        </p>
                        <p className="text-xs text-gray-500">
                            Faster POS experience
                        </p>
                    </div>
                    <button
                        onClick={toggleFastOrderMode}
                        className={`relative w-13 h-8 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                            fastOrderMode ? "bg-rose-600" : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-200 ${
                                fastOrderMode
                                    ? "translate-x-5"
                                    : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Settings Sections */}
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Account Settings
            </h3>
            <div className="bg-white rounded-xl p-4 py-2 space-y-1 shadow-sm">
                <SettingsRow
                    icon={<Pencil size={20} className="text-gray-900" />}
                    label="Personal Details"
                    disabled
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
                    sublabel={`You're assigned in ${stores.length} ${stores.length !== 1 ? "stores" : "store"}`}
                    onClick={handleAssignedStores}
                />
                <SettingsRow
                    icon={<Bell size={20} className="text-gray-900" />}
                    label="Notifications"
                    disabled
                />
                <SettingsRow
                    icon={<Globe size={20} className="text-gray-900" />}
                    label="Language"
                    disabled
                />
                {isAdmin && (
                    <SettingsRow
                        icon={<Wrench size={20} className="text-gray-900" />}
                        label="Admin Dashboard"
                        onClick={handleAdminDashboard}
                        sublabel={"Manage your store and settings"}
                    />
                )}
            </div>

            {/* Logout + Version */}
            <div className="mt-8 pb-10 flex flex-col items-center gap-2">
                <div className="text-gray-900">
                    <VersionInfo />
                </div>
                <button
                    onClick={handleLogout}
                    className="text-sm font-semibold text-red-500 py-2 px-6"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
