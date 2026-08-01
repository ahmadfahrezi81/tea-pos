"use client";

import { useState } from "react";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { ChevronRight, UserCircle, Search, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

type StaffUser = ReturnType<typeof useTenantUsers>["users"][number];

/**
 * Searchable list of non-admin staff.
 *
 * Shared because two pages need the same list for different reasons — viewing
 * someone's payroll info, and assigning their commission type — and the only
 * things that differ are where a row goes and what its subtitle says.
 */
export function StaffList({
    onSelect,
    subtitle,
    emptyLabel = "No staff found.",
}: {
    onSelect: (userId: string) => void;
    subtitle: (user: StaffUser) => ReactNode;
    emptyLabel?: string;
}) {
    const { users, isLoading } = useTenantUsers();
    const [search, setSearch] = useState("");

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
                    <p className="py-4 text-sm text-gray-400">
                        {search ? "No staff match your search." : emptyLabel}
                    </p>
                ) : (
                    filtered.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => onSelect(user.id)}
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
                                <p className="text-sm text-gray-400 truncate">{subtitle(user)}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-400 shrink-0" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
