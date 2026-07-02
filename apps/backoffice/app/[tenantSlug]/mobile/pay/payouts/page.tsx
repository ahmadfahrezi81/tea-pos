"use client";

import { useState, useMemo } from "react";
import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { parseISO, format, getISOWeek, startOfMonth, endOfMonth } from "date-fns";
import { UserCircle, ArrowUpRight, CalendarDays, Search, SlidersHorizontal, X, Check } from "lucide-react";
import Image from "next/image";
import { getCurrentLocalMonth } from "@tea-pos/utils/time";
import type { PayoutResponse } from "@tea-pos/features/payroll/schema";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
};

type StatusFilter = "all" | "ongoing" | "paid" | "needs_review";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
    all: "All",
    ongoing: "Ongoing",
    paid: "Paid",
    needs_review: "Needs Review",
};

function FilterDrawer({
    isOpen,
    onClose,
    statusFilter,
    onStatusFilterChange,
}: {
    isOpen: boolean;
    onClose: () => void;
    statusFilter: StatusFilter;
    onStatusFilterChange: (v: StatusFilter) => void;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
            <div className="w-full bg-white rounded-t-2xl px-4 pt-5 pb-10" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center mb-4">
                    <div className="w-8 h-1 rounded-full bg-gray-300" />
                </div>
                <div className="flex items-center justify-between mb-5">
                    <p className="text-lg font-bold text-gray-900">Filter</p>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
                <div className="flex flex-col gap-1">
                    {(Object.entries(STATUS_FILTER_LABELS) as [StatusFilter, string][]).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => onStatusFilterChange(value)}
                            className="flex items-center justify-between px-3 py-3 rounded-xl active:bg-gray-50"
                        >
                            <span className={`text-[15px] font-medium ${statusFilter === value ? "text-brand" : "text-gray-800"}`}>
                                {label}
                            </span>
                            {statusFilter === value && <Check size={16} className="text-brand" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function StaffPayoutsPage() {
    const { url } = useTenantSlug();
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentLocalMonth());
    const [query, setQuery] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const { payouts, isLoading } = usePayouts();
    const { users } = useTenantUsers();

    const userById = Object.fromEntries(users.map((u) => [u.id, u]));
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return payouts.filter((p) => {
            const start = parseISO(p.startDate);
            const end = parseISO(p.endDate);
            if (!(start <= monthEnd && end >= monthStart)) return false;

            if (statusFilter === "ongoing" && p.status !== "pending") return false;
            if (statusFilter === "paid" && p.status !== "paid") return false;
            if (statusFilter === "needs_review" && !((p.pendingCount ?? 0) > 0)) return false;

            if (q) {
                const user = userById[p.userId];
                const name = (user?.fullName ?? "").toLowerCase();
                if (!name.includes(q)) return false;
            }

            return true;
        });
    }, [payouts, selectedMonth, monthStart, monthEnd, statusFilter, query, userById]);

    const pending = filtered.filter((p) => p.status === "pending").sort((a, b) => (b.pendingCount ?? 0) - (a.pendingCount ?? 0) || b.startDate.localeCompare(a.startDate));
    const done = filtered.filter((p) => p.status !== "pending").sort((a, b) => b.startDate.localeCompare(a.startDate));

    const activeFilterCount = statusFilter !== "all" ? 1 : 0;

    function renderCard(payout: PayoutResponse) {
        const user = userById[payout.userId];
        const weekStart = getISOWeek(parseISO(payout.startDate));
        const weekEnd = getISOWeek(parseISO(payout.endDate));
        const sameWeek = weekStart === weekEnd;

        return (
            <button
                key={payout.id}
                onClick={() => navigation.push(url(`/mobile/pay/payouts/${payout.id}?userId=${payout.userId}`))}
                className="w-full bg-white rounded-2xl p-4 text-left active:bg-gray-50 space-y-3"
            >
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-gray-900">
                            {sameWeek ? `Week ${weekStart}` : `Week ${weekStart} · Week ${weekEnd}`}
                        </p>
                        <p className="text-sm text-gray-500">
                            {format(parseISO(payout.startDate), "EEE, d MMM")} – {format(parseISO(payout.endDate), "EEE, d MMM")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLE[payout.status] ?? STATUS_STYLE.pending}`}>
                            {payout.status === "pending" ? "Ongoing" : `Paid${payout.paidAt ? ` · ${format(new Date(payout.paidAt), "d MMM")}` : ""}`}
                        </span>
                        <ArrowUpRight size={18} className="text-gray-400" />
                    </div>
                </div>

                {/* User profile */}
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5 w-full">
                    {user?.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.fullName ?? ""} width={28} height={28} className="rounded-lg object-cover shrink-0" />
                    ) : (
                        <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                            <UserCircle size={18} className="text-brand" />
                        </div>
                    )}
                    <p className="text-base font-bold text-gray-900 truncate flex-1">{user?.fullName ?? "Unknown"}</p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Orders</p>
                        <p className="text-xl font-bold text-orange-900">{payout.totalOrders}</p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Cups</p>
                        <p className="text-xl font-bold text-blue-900">{payout.totalCups}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-lg col-span-2">
                        <p className="text-xs font-semibold text-gray-700">Total Pay</p>
                        <p className="text-xl font-bold text-green-900">Rp {payout.totalPay.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="col-span-4 grid grid-cols-2 gap-2">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Pending</p>
                            <p className="text-xl font-bold text-yellow-900">{payout.pendingCount ?? 0}</p>
                        </div>
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Approved</p>
                            <p className="text-xl font-bold text-purple-900">{payout.approvedCount ?? 0}</p>
                        </div>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="space-y-3">
            {/* Month selector */}
            <div className="bg-white p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    Select Month
                </label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            </div>

            {/* Search + Filter */}
            <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search staff..."
                        className="flex-1 text-base text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-gray-400">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="relative flex items-center justify-center w-11 bg-white rounded-xl active:bg-gray-50"
                >
                    <SlidersHorizontal size={18} className={activeFilterCount > 0 ? "text-brand" : "text-gray-500"} />
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl p-4 h-40 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No payouts for this period.</p>
            ) : (
                <div className="space-y-2">
                    {pending.map(renderCard)}
                    {pending.length > 0 && done.length > 0 && (
                        <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Done</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>
                    )}
                    {done.map(renderCard)}
                </div>
            )}

            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                statusFilter={statusFilter}
                onStatusFilterChange={(v) => { setStatusFilter(v); setIsFilterOpen(false); }}
            />
        </div>
    );
}
