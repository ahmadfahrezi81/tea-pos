"use client";

import { useState } from "react";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useAllPayrollUserInfos } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { ChevronRight, UserCircle, Search, X } from "lucide-react";
import Image from "next/image";

export default function StaffPayrollInfoListPage() {
    const { users, isLoading } = useTenantUsers();
    const { infos } = useAllPayrollUserInfos();
    const { commissionTypes } = usePayrollCommissionTypes();
    const { url } = useTenantSlug();
    const [search, setSearch] = useState("");

    const infoByUserId = Object.fromEntries(infos.map((i) => [i.userId, i]));
    const typeById = Object.fromEntries(commissionTypes.map((t) => [t.id, t]));

    const staff = users.filter((u) => u.role !== "ADMIN");
    const filtered = search.trim()
        ? staff.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()))
        : staff;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="flex-1 text-base text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="text-gray-400 active:text-gray-600 shrink-0">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0 animate-pulse" />
                            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">{search ? "No staff match your search." : "No staff found."}</p>
                ) : (
                    filtered.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => navigation.push(url(`/mobile/pay/staff/${user.id}`))}
                            className="w-full flex items-center gap-3 py-4 border-b border-gray-100 last:border-none text-left active:bg-gray-50"
                        >
                            {user.avatarUrl ? (
                                <Image
                                    src={user.avatarUrl}
                                    alt={user.fullName}
                                    width={36}
                                    height={36}
                                    className="w-9 h-9 rounded-xl object-cover shrink-0"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                                    <UserCircle size={20} className="text-brand" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-medium text-gray-900 truncate">{user.fullName}</p>
                                <p className="text-sm text-gray-400">
                                    {user.role}
                                    {(() => {
                                        const slug = infoByUserId[user.id]?.commissionConfigId
                                            ? typeById[infoByUserId[user.id].commissionConfigId!]?.slug
                                            : null;
                                        return slug ? <span className="ml-1.5 font-mono text-xs text-brand/70">· {slug}</span> : null;
                                    })()}
                                </p>
                            </div>
                            <ChevronRight size={18} className="text-gray-400 shrink-0" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
