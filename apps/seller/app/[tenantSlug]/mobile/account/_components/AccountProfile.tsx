"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import {
    Pencil,
    Bell,
    Globe,
    Wrench,
    ChevronRight,
    UserCircle,
} from "lucide-react";
import Image from "next/image";
import { navigation } from "@tea-pos/utils/navigation";
k;

// ============================================================================
// SETTINGS ROW
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AccountProfile() {
    const router = useRouter();
    const { url } = useTenantSlug();
    const { profile, avatarUrl } = useAuth();

    const handleLogout = useCallback(async () => {
        const shouldLogout = window.confirm(
            "Are you sure you want to log out?",
        );
        if (shouldLogout) {
            await fetch("/api/auth/signout", {
                method: "POST",
                credentials: "include",
            });
            router.push("/login");
        }
    }, [router]);

    const handleAdminDashboard = useCallback(() => {
        window.open(url("/admin"), "_blank", "noopener,noreferrer");
    }, [url]);

    if (!profile) return null;

    const isAdmin = profile.role === "ADMIN";

    return (
        <div className="min-h-screen space-y-4">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="shrink-0">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={profile.fullName}
                            width={64}
                            height={64}
                            className="rounded-full object-cover border-2 border-brand/20"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
                            <UserCircle size={40} className="text-brand" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xl font-semibold text-gray-900 leading-tight truncate">
                        {profile.fullName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                        {profile.email}
                    </p>
                </div>
            </div>

            {/* Account Settings */}
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Account
            </h3>
            <div className="bg-white rounded-xl p-4 py-1 space-y-1 shadow-sm">
                <SettingsRow
                    icon={<Pencil size={20} className="text-gray-900" />}
                    label="Personal Details"
                    sublabel="View your account info"
                    onClick={() =>
                        navigation.push(url("/mobile/account/details"))
                    }
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
                        sublabel="Manage your store and settings"
                        onClick={handleAdminDashboard}
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
