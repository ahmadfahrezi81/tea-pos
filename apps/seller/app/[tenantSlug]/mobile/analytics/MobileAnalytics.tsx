"use client";

import { useState, useMemo } from "react";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { DailySummary } from "@tea-pos/features/summaries/schema";
import { Expense } from "@tea-pos/features/expenses/schema";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { toIndonesiaMonthYear } from "@tea-pos/utils/server-config/timezone";
import { getCurrentLocalMonth } from "@tea-pos/utils/time";
import { Calendar, CalendarDays, AlertTriangle, Receipt, MoreVertical, Info, Activity } from "lucide-react";
import { DetailsDrawer } from "./_components/DetailsDrawer";
import { useStore } from "@/lib/context/StoreContext";
import {
    formatDate,
    getExpensesForDate,
} from "../analytics/utils/summariesHelpers";
import { navigation } from "@tea-pos/utils/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { useSummaryPhotoCount } from "@/lib/hooks/summaries/useSummaryPhotoCount";

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

type DailySummaryWithExtras = DailySummary & {
    expenses: Expense[];
};

function PhotoCountLabel({ summaryId }: { summaryId: string }) {
    const { count } = useSummaryPhotoCount(summaryId);
    if (count === 0) return null;
    return (
        <p className="text-xs text-blue-500 mt-0.5">
            {count} photo{count > 1 ? "s" : ""}
        </p>
    );
}

export default function MobileAnalytics() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();

    const [selectedMonth, setSelectedMonth] = useState<string>(
        getCurrentLocalMonth(),
    );
    const [selectedSummary, setSelectedSummary] =
        useState<DailySummaryWithExtras | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const {
        data: summariesData,
        isLoading: summariesLoading,
        error: summariesError,
    } = useSummaries(selectedStoreId, selectedMonth);

    const unclosedSummaries = useMemo(
        () => summariesData?.summaries.filter((s) => !s.closedAt) ?? [],
        [summariesData?.summaries],
    );

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
            {summariesData?.monthlyTotals && (
                <div className="bg-white p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Receipt size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-800">Monthly Summary</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <p className="text-xl font-bold text-blue-600">
                                {summariesData.monthlyTotals.totalOrders}
                            </p>
                            <p className="text-sm text-gray-600">Orders</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-orange-600">
                                {summariesData.monthlyTotals.totalCups}
                            </p>
                            <p className="text-sm text-gray-600">Cups</p>
                        </div>
                        <div className="text-center col-span-2 border-l-2 border-gray-300">
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="text-xl font-bold text-green-600">
                                {formatRupiah(summariesData.monthlyTotals.totalSales)}
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
                            {unclosedSummaries.length - 1} Overdue Unclosed Day(s)
                        </h3>
                    </div>
                    <p className="text-sm text-red-700">
                        Please close these days to maintain accurate financial records.
                    </p>
                </div>
            )}

            {/* Month Filter */}
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

            <MiniDailySalesChart
                summaries={summariesData?.summaries ?? []}
                storeId={selectedStoreId}
                month={selectedMonth}
            />

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
                    {!summariesData?.summaries || summariesData.summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl text-center">
                            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">
                                No daily summary found for selected month
                            </p>
                        </div>
                    ) : (
                        summariesData.summaries.map((summary) => {
                            const dailyExpenses = getExpensesForDate(summariesData, summary.date);
                            const summaryWithExtras: DailySummaryWithExtras = {
                                ...summary,
                                expenses: summary.expenses ?? dailyExpenses,
                            };

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
                                                            Closed
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-sm font-medium self-center">
                                                            Open
                                                        </span>
                                                    )}
                                                </div>
                                                <PhotoCountLabel summaryId={summary.id} />
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === summary.id ? null : summary.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand active:opacity-80 active:scale-95 text-white transition-transform duration-100"
                                                >
                                                    <MoreVertical size={24} strokeWidth={2} />
                                                </button>
                                                {openMenuId === summary.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-max">
                                                            <button
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    setSelectedSummary(summaryWithExtras);
                                                                    setShowDetailsModal(true);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-900 font-medium active:bg-gray-50 flex items-center gap-2.5"
                                                            >
                                                                <Info size={15} className="text-gray-600" />
                                                                Details
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    navigation.push(url(`/mobile/analytics/daily/${summary.id}/events?storeId=${selectedStoreId}&date=${summary.date}`));
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-900 font-medium active:bg-gray-50 flex items-center gap-2.5"
                                                            >
                                                                <Activity size={15} className="text-gray-600" />
                                                                Day Activity
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 rounded-2xl p-2 bg-slate-100 text-gray-800">
                                            <div>
                                                <p className="text-xs">Opening Balance</p>
                                                <p className="text-lg font-extrabold text-blue-600">
                                                    {formatRupiah(summary.openingBalance)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">Total Sales</p>
                                                <p className="text-lg font-extrabold text-green-600">
                                                    {formatRupiah(summary.totalSales)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">Opening + Sales</p>
                                                <p className="text-lg font-extrabold text-purple-600">
                                                    {formatRupiah(summary.openingBalance + summary.totalSales)}
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <p className="text-xs">Orders</p>
                                                    <p className="text-lg font-extrabold text-blue-600">
                                                        {summary.totalOrders}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs">Cups</p>
                                                    <p className="text-lg font-extrabold text-orange-600">
                                                        {summary.totalCups}
                                                    </p>
                                                </div>
                                            </div>
                                            <hr className="col-span-2 border-gray-300" />
                                            <div>
                                                <p className="text-xs">Net Expected Cash</p>
                                                <p className="text-lg font-extrabold text-purple-600">
                                                    {formatRupiah(summary.expectedCash)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">Actual Cash (Counted)</p>
                                                <p className="text-lg font-extrabold text-orange-600">
                                                    {summary.actualCash !== null
                                                        ? formatRupiah(summary.actualCash)
                                                        : "Not counted"}
                                                </p>
                                            </div>
                                        </div>

                                        {dailyExpenses.length > 0 && (
                                            <div>
                                                <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                    Expenses of the Day
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
                                                    Variance
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
                                                    Notes
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
                                                Close Day
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {selectedSummary && (
                <DetailsDrawer
                    isOpen={showDetailsModal}
                    summary={selectedSummary}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedSummary(null);
                    }}
                    storeName={selectedSummary.storeId ?? ""}
                />
            )}
        </div>
    );
}
