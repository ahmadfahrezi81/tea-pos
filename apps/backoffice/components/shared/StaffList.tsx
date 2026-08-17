"use client";

import { useState } from "react";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { UserCircle, Search, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { ListRow, ListCard, ListRowSkeleton } from "@tea-pos/ui/custom/ListRow";

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
    titleTag,
    emptyLabel = "No staff found.",
}: {
    onSelect: (userId: string) => void;
    subtitle: (user: StaffUser) => ReactNode;
    /** Badge beside the name — a screen that cares about account state says so. */
    titleTag?: (user: StaffUser) => ReactNode;
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

            <ListCard>
                {isLoading ? (
                    [1, 2, 3].map((i) => <ListRowSkeleton key={i} withLeading />)
                ) : filtered.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">
                        {search ? "No staff match your search." : emptyLabel}
                    </p>
                ) : (
                    filtered.map((user) => (
                        <ListRow
                            key={user.id}
                            onClick={() => onSelect(user.id)}
                            leading={
                                user.avatarUrl ? (
                                    <Image
                                        src={user.avatarUrl}
                                        alt={user.fullName}
                                        width={36}
                                        height={36}
                                        className="w-9 h-9 rounded-xl object-cover"
                                    />
                                ) : (
                                    <span className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                                        <UserCircle size={20} className="text-brand" />
                                    </span>
                                )
                            }
                            title={
                                titleTag ? (
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{user.fullName}</span>
                                        {titleTag(user)}
                                    </span>
                                ) : (
                                    user.fullName
                                )
                            }
                            subtitle={subtitle(user)}
                        />
                    ))
                )}
            </ListCard>
        </div>
    );
}
