"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useT } from "@/lib/hooks/useT";
import VersionInfo from "@/components/shared/VersionInfo";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { Pencil, Globe, ChevronRight, UserCircle, Wallet } from "lucide-react";
import Image from "next/image";
import { navigation } from "@tea-pos/utils/navigation";

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
    const { user, avatarUrl, signOut } = useAuth();
    const t = useT();

    const handleLogout = useCallback(async () => {
        const shouldLogout = window.confirm(t("account.logoutConfirm"));
        if (shouldLogout) {
            await signOut();
            router.push("/login");
        }
    }, [router, signOut, t]);

    if (!user) return null;

    return (
        <div className="min-h-full flex flex-col">
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
                        label={t("account.personalDetails")}
                        onClick={() => navigation.push(url("/mobile/account/details"))}
                    />
                    <SettingsRow
                        icon={<Wallet size={22} strokeWidth={2} className="text-gray-900" />}
                        label={t("account.payrollInfo")}
                        onClick={() => navigation.push(url("/mobile/account/payroll-info"))}
                    />
                    <SettingsRow
                        icon={<Globe size={22} strokeWidth={2} className="text-gray-900" />}
                        label={t("account.language")}
                        onClick={() => navigation.push(url("/mobile/account/language"))}
                    />
                </div>
            </div>

            {/* Logout + Version */}
            <div className="mt-auto pt-4 flex flex-col items-center gap-3">
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white py-3 px-16 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
                >
                    {t("common.logout")}
                </button>
                <VersionInfo />
            </div>
        </div>
    );
}
