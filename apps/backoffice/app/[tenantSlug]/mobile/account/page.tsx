"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, Globe, UserCircle, Settings } from "lucide-react";
import Image from "next/image";
import { SettingsRow } from "@tea-pos/ui/custom/SettingsRow";
import VersionInfo from "@tea-pos/ui/custom/VersionInfo";

export default function AccountPage() {
    const router = useRouter();
    const { user, avatarUrl } = useAuth();

    const handleLogout = useCallback(async () => {
        if (!window.confirm("Are you sure you want to log out?")) return;
        await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
        router.push("/login");
    }, [router]);

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
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                </div>

                {/* Account Settings */}
                <div className="bg-white rounded-2xl px-4 py-1">
                    <SettingsRow
                        icon={<Settings size={22} strokeWidth={2} className="text-gray-900" />}
                        label="Preferences"
                        disabled
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
            </div>

            {/* Logout + Version */}
            <div className="mt-auto pt-4 flex flex-col items-center gap-3">
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white py-3 px-16 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
                >
                    Log Out
                </button>
                <VersionInfo />
            </div>
        </div>
    );
}
