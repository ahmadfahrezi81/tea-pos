"use client";

import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { ChevronRight } from "lucide-react";

export default function StaffPayrollInfoListPage() {
    const { users, isLoading } = useTenantUsers();
    const { url } = useTenantSlug();

    const staff = users.filter((u) => u.role !== "ADMIN");

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none">
                            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : staff.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No staff found.</p>
                ) : (
                    staff.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => navigation.push(url(`/mobile/pay/staff/${user.id}`))}
                            className="w-full flex items-center gap-3 py-4 border-b border-gray-100 last:border-none text-left active:bg-gray-50"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-medium text-gray-900">{user.fullName}</p>
                                <p className="text-sm text-gray-400">{user.role}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-400 shrink-0" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
