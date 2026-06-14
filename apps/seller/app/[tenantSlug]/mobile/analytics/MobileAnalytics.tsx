"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Drawer } from "vaul";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { toIndonesiaMonthYear } from "@tea-pos/utils/server-config/timezone";
import { getCurrentLocalMonth } from "@tea-pos/utils/time";
import { Calendar, CalendarDays, AlertTriangle, Receipt, MoreVertical, Info, UserCircle, History, Users, X } from "lucide-react";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { useStore } from "@/lib/context/StoreContext";
import {
    formatDate,
    getExpensesForDate,
} from "../analytics/utils/summariesHelpers";
import { navigation } from "@tea-pos/utils/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { useMobileScroll } from "../components/MobileScrollContext";
import { useT } from "@/lib/hooks/useT";

import dynamic from "next/dynamic";
const MiniDailySalesChart = dynamic(
    () => import("./_components/MiniDailySalesChart"),
    {
        ssr: false,
        loading: () => (
            <div className="h-32 animate-pulse bg-gray-100 rounded-xl" />
        ),
    },
);


export default function MobileAnalytics() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();
    const { scrollRef } = useMobileScroll();
    const pathname = usePathname();
    const scrollRestored = useRef(false);

    const [selectedMonth, setSelectedMonth] = useState<string>(
        getCurrentLocalMonth(),
    );
    const [activeSummary, setActiveSummary] = useState<{ id: string; date: string } | null>(null);
    const t = useT();

    const {
        data: summariesData,
        isLoading: summariesLoading,
        error: summariesError,
    } = useSummaries(selectedStoreId, selectedMonth);

    const unclosedSummaries = useMemo(
        () => summariesData?.summaries.filter((s) => !s.closedAt) ?? [],
        [summariesData?.summaries],
    );

    useEffect(() => {
        if (summariesData && !scrollRestored.current && scrollRef.current) {
            const saved = sessionStorage.getItem(`scroll:${pathname}`);
            if (saved) {
                scrollRef.current.scrollTop = parseInt(saved, 10);
                sessionStorage.removeItem(`scroll:${pathname}`);
            }
            scrollRestored.current = true;
        }
    }, [summariesData, scrollRef, pathname]);

    if (summariesError) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600">
                    Error loading analytics: {summariesError.message}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Monthly Summary */}
            {(summariesLoading || summariesData?.monthlyTotals) && (
                <div className="bg-white p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Receipt size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-800">{t("analytics.monthlyTotals")}</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <p className="text-xl font-bold text-blue-600">
                                <SkeletonValue loading={summariesLoading} className="h-7 w-8">{summariesData?.monthlyTotals?.totalOrders ?? 0}</SkeletonValue>
                            </p>
                            <p className="text-sm text-gray-600">{t("analytics.orders")}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-orange-600">
                                <SkeletonValue loading={summariesLoading} className="h-7 w-8">{summariesData?.monthlyTotals?.totalCups ?? 0}</SkeletonValue>
                            </p>
                            <p className="text-sm text-gray-600">{t("analytics.cups")}</p>
                        </div>
                        <div className="text-center col-span-2 border-l-2 border-gray-300">
                            <p className="text-sm text-gray-600">{t("analytics.totalSales")}</p>
                            <p className="text-xl font-bold text-green-600">
                                <SkeletonValue loading={summariesLoading} className="h-7 w-24">{formatRupiah(summariesData?.monthlyTotals?.totalSales ?? 0)}</SkeletonValue>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Unclosed Days Warning */}
            {unclosedSummaries.length > 1 && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={20} className="text-red-600" />
                        <h3 className="font-semibold text-red-800">
                            {unclosedSummaries.length - 1} {t("analytics.unclosedWarning")}
                        </h3>
                    </div>
                    <p className="text-sm text-red-700">
                        {t("analytics.unclosedSub")}
                    </p>
                </div>
            )}

            {/* Month Filter */}
            <div className="bg-white p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    {t("analytics.selectMonth")}
                </label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            </div>

            {summariesLoading ? (
                <div className="h-[160px] bg-white rounded-2xl animate-pulse" />
            ) : (
                <MiniDailySalesChart
                    summaries={summariesData?.summaries ?? []}
                    storeId={selectedStoreId}
                    month={selectedMonth}
                />
            )}

            {/* Summaries Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                    {toIndonesiaMonthYear(selectedMonth)}
                </h3>
                <span className="text-sm text-gray-500">
                    {summariesData?.summaries?.length ?? 0}{" "}
                    {(summariesData?.summaries?.length ?? 0) === 1 ? "summary" : "summaries"}
                </span>
            </div>

            {/* Daily Summaries */}
            {selectedStoreId && (
                <div className="space-y-3">
                    {summariesLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-3 animate-pulse space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-7 w-32 bg-gray-200 rounded-md" />
                                    <div className="h-7 w-7 bg-gray-200 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-2xl p-2">
                                    <div className="h-12 bg-gray-200 rounded-md" />
                                    <div className="h-12 bg-gray-200 rounded-md" />
                                    <div className="h-12 bg-gray-200 rounded-md" />
                                    <div className="h-12 bg-gray-200 rounded-md" />
                                </div>
                            </div>
                        ))
                    ) : !summariesData?.summaries || summariesData.summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl text-center">
                            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">
                                {t("analytics.noSummary")}
                            </p>
                        </div>
                    ) : (
                        summariesData.summaries.map((summary) => {
                            const dailyExpenses = getExpensesForDate(summariesData, summary.date);

                            return (
                                <div
                                    key={summary.id}
                                    className="bg-white rounded-2xl overflow-hidden"
                                >
                                    <div className="p-3 bg-white space-y-3">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold text-gray-800">
                                                        {formatDate(summary.date)}
                                                    </h3>
                                                    {summary.closedAt ? (
                                                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-medium self-center">
                                                            {t("analytics.statusClosed")}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-sm font-medium self-center">
                                                            {t("analytics.statusOpen")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveSummary({ id: summary.id, date: summary.date })}
                                                className="size-8 shrink-0 flex items-center justify-center text-gray-500 active:opacity-60 rounded-lg transition-colors"
                                            >
                                                <MoreVertical size={22} strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 rounded-2xl p-2 bg-slate-100 text-gray-800">
                                            <div>
                                                <p className="text-xs">{t("analytics.openingBalance")}</p>
                                                <p className="text-lg font-extrabold text-blue-600">
                                                    {formatRupiah(summary.openingBalance)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">{t("analytics.totalSales")}</p>
                                                <p className="text-lg font-extrabold text-green-600">
                                                    {formatRupiah(summary.totalSales)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">{t("analytics.openingPlusSales")}</p>
                                                <p className="text-lg font-extrabold text-purple-600">
                                                    {formatRupiah(summary.openingBalance + summary.totalSales)}
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <p className="text-xs">{t("analytics.orders")}</p>
                                                    <p className="text-lg font-extrabold text-blue-600">
                                                        {summary.totalOrders}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs">{t("analytics.cups")}</p>
                                                    <p className="text-lg font-extrabold text-orange-600">
                                                        {summary.totalCups}
                                                    </p>
                                                </div>
                                            </div>
                                            <hr className="col-span-2 border-gray-300" />
                                            <div>
                                                <p className="text-xs">{t("analytics.expectedCash")}</p>
                                                <p className="text-lg font-extrabold text-purple-600">
                                                    {formatRupiah(summary.expectedCash)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">{t("analytics.actualCash")}</p>
                                                <p className="text-lg font-extrabold text-orange-600">
                                                    {summary.actualCash !== null
                                                        ? formatRupiah(summary.actualCash)
                                                        : t("analytics.notCounted")}
                                                </p>
                                            </div>
                                        </div>

                                        {(summary.sessions ?? []).length > 0 && (
                                            <div>
<div className="flex flex-wrap gap-1.5">
                                                    {(summary.sessions ?? []).map((s) => (
                                                        <div
                                                            key={s.userId}
                                                            className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5 pr-3.5 w-full"
                                                        >
                                                            {s.userAvatarUrl ? (
                                                                <Image
                                                                    src={s.userAvatarUrl}
                                                                    alt={s.userName ?? ""}
                                                                    width={28}
                                                                    height={28}
                                                                    className="rounded-lg object-cover shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                                                    <UserCircle size={18} className="text-brand" />
                                                                </div>
                                                            )}
                                                            <p className="text-base font-bold text-gray-900 truncate">
                                                                {s.userName ?? "Unknown"}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {dailyExpenses.length > 0 && (
                                            <div>
                                                <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                    {t("analytics.expensesOfDay")}
                                                </h4>
                                                <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
                                                    {dailyExpenses.map((expense) => (
                                                        <div
                                                            key={expense.id}
                                                            className="flex justify-between text-sm"
                                                        >
                                                            <span className="text-red-700">
                                                                {expense.type}
                                                            </span>
                                                            <span className="font-medium text-red-800">
                                                                -{formatRupiah(expense.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="border-t border-red-300 mt-1 pt-1 flex justify-between font-medium">
                                                        <span className="text-red-700">Total</span>
                                                        <span className="text-red-800">
                                                            -{formatRupiah(summary.totalExpenses)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {summary.variance !== null && (
                                            <div>
                                                <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                    {t("analytics.variance")}
                                                </h4>
                                                <p
                                                    className={`text-sm px-3 py-2 rounded-lg font-medium ${
                                                        summary.variance >= 0
                                                            ? "bg-green-50 border border-green-200 text-green-700"
                                                            : "bg-red-50 border border-red-200 text-red-700"
                                                    }`}
                                                >
                                                    {summary.variance >= 0 ? "+" : ""}
                                                    {formatRupiah(summary.variance)}
                                                </p>
                                            </div>
                                        )}

                                        {summary.notes && (
                                            <div>
                                                <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                    {t("analytics.notes")}
                                                </h4>
                                                <p className="text-sm text-gray-700 bg-slate-100 p-2 rounded-xl">
                                                    {summary.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {!summary.closedAt && (
                                        <div className="border-t border-gray-100 p-3">
                                            <button
                                                onClick={() =>
                                                    navigation.push(
                                                        url(`/mobile/home/manage/close?summaryId=${summary.id}&month=${summary.date.slice(0, 7)}`),
                                                    )
                                                }
                                                className="w-full bg-red-500 text-white py-4 px-4 rounded-xl text-sm font-semibold active:scale-95"
                                            >
                                                {t("analytics.closeDay")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <Drawer.Root open={!!activeSummary} onOpenChange={(open) => !open && setActiveSummary(null)}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pt-5 pb-8 focus:outline-none">
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <Drawer.Title className="text-xl font-bold text-gray-900">
                            {activeSummary ? formatDate(activeSummary.date) : ""}
                        </Drawer.Title>
                        <Drawer.Description className="sr-only">Daily summary options</Drawer.Description>
                        <button
                            onClick={() => setActiveSummary(null)}
                            className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                        >
                            <X size={26} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                if (!activeSummary) return;
                                setActiveSummary(null);
                                navigation.push(url(`/mobile/analytics/daily/${activeSummary.id}`));
                            }}
                            className="w-full flex items-center gap-3 py-5 border-b transition-colors"
                        >
                            <Info size={20} strokeWidth={2} className="text-gray-900" />
                            <span className="text-lg text-gray-900">{t("analytics.details")}</span>
                        </button>
                        <button
                            onClick={() => {
                                if (!activeSummary) return;
                                setActiveSummary(null);
                                navigation.push(url(`/mobile/analytics/daily/${activeSummary.id}/events`));
                            }}
                            className="w-full flex items-center gap-3 py-5 border-b transition-colors"
                        >
                            <History size={20} strokeWidth={2} className="text-gray-900" />
                            <span className="text-lg text-gray-900">{t("analytics.activity")}</span>
                        </button>
                        <button
                            onClick={() => {
                                if (!activeSummary) return;
                                setActiveSummary(null);
                                navigation.push(url(`/mobile/analytics/daily/${activeSummary.id}/sessions?storeId=${selectedStoreId}&date=${activeSummary.date}`));
                            }}
                            className="w-full flex items-center gap-3 py-5 transition-colors"
                        >
                            <Users size={20} strokeWidth={2} className="text-gray-900" />
                            <span className="text-lg text-gray-900">{t("analytics.sessions")}</span>
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
        </div>
    );
}
