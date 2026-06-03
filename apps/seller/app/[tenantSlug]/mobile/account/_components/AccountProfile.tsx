"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { Pencil, Bell, Globe, ChevronRight, UserCircle, Banknote, ReceiptText } from "lucide-react";
import Image from "next/image";
import { navigation } from "@tea-pos/utils/navigation";
import { useFlags } from "@/lib/context/FlagsContext";

// ============================================================================
// SETTINGS ROW
// ============================================================================

const SettingsRow = ({
    icon,
    label,
    onClick,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
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
            {!disabled && (
                <ChevronRight
                    size={20}
                    strokeWidth={2.5}
                    className="text-brand/90"
                />
            )}
        </div>
    </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AccountProfile() {
    const router = useRouter();
    const { url } = useTenantSlug();
    const { user, avatarUrl } = useAuth();
    const { flags: { isReimbursementEnabled }, isLoading: flagsLoading } = useFlags();

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

    if (!user) return null;

    return (
        <div className="space-y-4">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
                <div className="shrink-0">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={user.fullName}
                            width={64}
                            height={64}
                            className="rounded-2xl object-cover border-2 border-brand/20"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                            <UserCircle size={40} className="text-brand" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xl font-semibold text-gray-900 leading-tight truncate">
                        {user.fullName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                        {user.email}
                    </p>
                </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white rounded-2xl px-4 py-1">
                <SettingsRow
                    icon={<Pencil size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Personal Details"
                    onClick={() => navigation.push(url("/mobile/account/details"))}
                />
                <SettingsRow
                    icon={<Banknote size={22} strokeWidth={2} className="text-gray-900" />}
                    label="My Pay"
                    onClick={() => navigation.push(url("/mobile/account/earnings"))}
                />
                <SettingsRow
                    icon={<ReceiptText size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Reimbursements"
                    onClick={() => navigation.push(url("/mobile/account/reimbursements"))}
                    disabled={flagsLoading ? false : !isReimbursementEnabled}
                />
                <SettingsRow
                    icon={<Bell size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Notifications"
                    disabled
                />
                <SettingsRow
                    icon={<Globe size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Language"
                    disabled
                />
            </div>

            {/* Logout + Version */}
            <div className="mt-8 flex flex-col items-center gap-2">
                <div className="text-gray-600">
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
