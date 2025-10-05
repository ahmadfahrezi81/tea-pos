// components/mobile/MobileAnalytics.tsx
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import useUserStores from "@/lib/hooks/shared/useUserStores";
import { SummariesData, useSummaries } from "@/lib/hooks/useSummaries";

import { formatRupiah } from "@/lib/utils/formatCurrency";
import { hasManagerRoleInStore } from "@/lib/utils/roleUtils";
import { toIndonesiaMonthYear } from "@/lib/timezone";

import {
    Calendar,
    StoreIcon,
    CalendarDays,
    AlertTriangle,
    CheckCircle,
    Receipt,
} from "lucide-react";

import { SetBalanceModal } from "./components/SetBalanceModal";
import { SetExpenseModal } from "./components/SetExpenseModal";
import { CloseDayModal } from "./components/CloseDayModal";
import {
    DailySummaryWithExpenses,
    DetailsModal,
} from "./components/DetailsModal";

import { ConfirmationPopup } from "@/components/mobile/shared/ConfirmationPopup";
import { DailySummary } from "@/lib/types";
import { Expense } from "@/lib/db.aliases";

// ============================================================================
// UTILITY FUNCTIONS - Outside component to prevent recreation
// ============================================================================

const isCurrentMonthSelected = (selectedMonth: string): boolean => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return selectedMonth === currentMonth;
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year:
            date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
};

const getProductBreakdownForDate = (
    summariesData: SummariesData | undefined,
    date: string
) => {
    return summariesData?.productBreakdown[date] || {};
};

const getCupsCountForDate = (
    summariesData: SummariesData | undefined,
    date: string
) => {
    const breakdown = getProductBreakdownForDate(summariesData, date);
    return Object.values(breakdown).reduce(
        (total, product) => total + product.quantity,
        0
    );
};

const getOrdersCountForDate = (
    summariesData: SummariesData | undefined,
    date: string
) => {
    return summariesData?.ordersByDate?.[date]?.length || 0;
};

const getExpensesForDate = (
    summariesData: SummariesData | undefined,
    date: string
) => {
    return summariesData?.expensesByDate?.[date] || [];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MobileAnalytics() {
    const { profile } = useAuth();
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7)
    );
    const [selectedSummary, setSelectedSummary] = useState<
        | (DailySummary & {
              expenses: Expense[];
              total_expenses: number;
          })
        | null
    >(null);

    // Popup states
    const [showOpenStorePopup, setShowOpenStorePopup] = useState(false);
    const [showCloseReminder, setShowCloseReminder] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [hasSeenPopup, setHasSeenPopup] = useState(false);
    const [hasSeenCloseReminder, setHasSeenCloseReminder] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    // Fetch user stores
    const { data: storesData, isLoading: storesLoading } = useUserStores();
    const stores = useMemo(
        () => storesData?.stores ?? [],
        [storesData?.stores]
    );
    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData?.assignments]
    );
    const defaultStore = storesData?.defaultStore;

    // Memoized manager stores
    const managerStores = useMemo(
        () =>
            stores.filter((store) =>
                hasManagerRoleInStore(profile?.id ?? "", store.id, assignments)
            ),
        [stores, profile?.id, assignments]
    );

    // Fetch summaries
    const {
        data: summariesData,
        isLoading: summariesLoading,
        error,
        createSummary,
        updateSummary,
        createExpenses,
    } = useSummaries(selectedStore, selectedMonth);

    // Memoized computed values
    const todaysSummary = useMemo(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        return summariesData?.summaries.find((s) => s.date === todayStr);
    }, [summariesData?.summaries]);

    const unclosedSummaries = useMemo(() => {
        return summariesData?.summaries.filter((s) => !s.closed_at) || [];
    }, [summariesData?.summaries]);

    // Memoized callbacks
    const showToast = useCallback(
        (message: string, type: "success" | "error") => {
            setToast({ message, type });
            setTimeout(() => setToast(null), 3000);
        },
        []
    );

    const getStoreName = useCallback(() => {
        return (
            stores.find((s) => s.id === selectedStore)?.name || "Unknown Store"
        );
    }, [stores, selectedStore]);

    // Auto-select default store (only if it's a manager store)
    useEffect(() => {
        if (defaultStore && !selectedStore && managerStores.length > 0) {
            const isDefaultManager = managerStores.some(
                (s) => s.id === defaultStore.id
            );
            if (isDefaultManager) {
                setSelectedStore(defaultStore.id);
            } else if (managerStores.length > 0) {
                setSelectedStore(managerStores[0].id);
            }
        }
    }, [defaultStore, selectedStore, managerStores]);

    // Open store reminder
    useEffect(() => {
        if (!selectedStore || !summariesData?.summaries || hasSeenPopup) return;
        if (!isCurrentMonthSelected(selectedMonth)) {
            setShowOpenStorePopup(false);
            return;
        }

        if (!todaysSummary) {
            setShowOpenStorePopup(true);
            setHasSeenPopup(true);
        } else {
            setShowOpenStorePopup(false);
        }
    }, [
        selectedStore,
        summariesData?.summaries,
        selectedMonth,
        hasSeenPopup,
        todaysSummary,
    ]);

    // Close day reminder (after 10 PM)
    useEffect(() => {
        if (!summariesData?.summaries || !selectedStore || hasSeenCloseReminder)
            return;

        if (todaysSummary && unclosedSummaries.length > 0) {
            const now = new Date();
            const hour = now.getHours();
            if (hour >= 22 || hour < 6) {
                setShowCloseReminder(true);
                setHasSeenCloseReminder(true);
            }
        }
    }, [
        summariesData?.summaries,
        selectedStore,
        todaysSummary,
        unclosedSummaries,
        hasSeenCloseReminder,
    ]);

    // ============================================================================
    // ACTION HANDLERS
    // ============================================================================

    const handleOpenStoreToday = async () => {
        if (!selectedStore || !profile) return;

        try {
            const todayStr = new Date().toISOString().split("T")[0];
            await createSummary({
                storeId: selectedStore,
                sellerId: profile.id,
                managerId: profile.id,
                date: todayStr,
                openingBalance: 0,
            });
            setShowOpenStorePopup(false);
            showToast("Store opened for today", "success");
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "Failed to open store",
                "error"
            );
        }
    };

    const handleExpenseSubmit = async (
        expenses: Array<{ label: string; customLabel?: string; amount: string }>
    ) => {
        if (!selectedSummary || !selectedStore) return;

        try {
            await createExpenses({
                dailySummaryId: selectedSummary.id,
                storeId: selectedStore,
                expenses,
            });
            setShowExpenseForm(false);
            setSelectedSummary(null);
            showToast("Expenses saved successfully", "success");
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : "Failed to save expenses",
                "error"
            );
        }
    };

    const handleBalanceSubmit = async (openingBalance: number) => {
        if (!selectedSummary) return;

        try {
            await updateSummary(selectedSummary.id, {
                opening_balance: openingBalance,
            });
            setShowEditForm(false);
            setSelectedSummary(null);
            showToast("Opening balance updated successfully", "success");
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : "Failed to update balance",
                "error"
            );
        }
    };

    const handleCloseDaySubmit = async (
        actualCash: number,
        notes: string | null,
        variance: number
    ) => {
        if (!selectedSummary) return;

        try {
            await updateSummary(selectedSummary.id, {
                actual_cash: actualCash,
                variance,
                notes: notes || null,
                closed_at: new Date().toISOString(),
            });
            setShowCloseForm(false);
            setSelectedSummary(null);
            showToast("Day closed successfully", "success");
            setShowCloseReminder(false);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "Failed to close day",
                "error"
            );
        }
    };

    // ============================================================================
    // LOADING STATES
    // ============================================================================

    const isLoading = storesLoading || summariesLoading;

    if (isLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">
                    Loading Analytics...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600">
                    Error loading analytics: {error.message}
                </p>
            </div>
        );
    }

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="space-y-4">
            {/* Monthly Summary */}
            {summariesData?.monthlyTotals && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Receipt size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-800">
                            Monthly Summary
                        </h3>
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
                                {formatRupiah(
                                    summariesData.monthlyTotals.totalSales
                                )}
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
                            {unclosedSummaries.length - 1} Overdue Unclosed
                            Day(s)
                        </h3>
                    </div>
                    <p className="text-sm text-red-700">
                        Please close these days to maintain accurate financial
                        records.
                    </p>
                </div>
            )}

            {/* Open Store Today Button */}
            {!todaysSummary && isCurrentMonthSelected(selectedMonth) && (
                <div className="bg-green-50 border border-green-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={20} className="text-green-600" />
                        <h3 className="font-semibold text-green-800">
                            Open store Today for {getStoreName()}
                        </h3>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                        Opening the store will initialize a summary with zero
                        balances.
                    </p>
                    <button
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                        onClick={() => setShowOpenStorePopup(true)}
                    >
                        Open Store on{" "}
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                        })}
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <CalendarDays size={16} className="inline mr-1" />
                        Select Month
                    </label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {managerStores.length > 1 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <StoreIcon size={16} className="inline mr-1" />
                            Select Store
                        </label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {managerStores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Summaries Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                    {toIndonesiaMonthYear(selectedMonth)}
                </h3>
                <span className="text-sm text-gray-500">
                    {summariesData?.summaries?.length ?? 0}{" "}
                    {(summariesData?.summaries?.length ?? 0) === 1
                        ? "summary"
                        : "summaries"}
                </span>
            </div>

            {/* Daily Summaries */}
            {selectedStore && (
                <div className="space-y-3">
                    {!summariesData?.summaries ||
                    summariesData.summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <Calendar
                                size={48}
                                className="mx-auto text-gray-400 mb-4"
                            />
                            <p className="text-gray-600">
                                No daily summary found for selected month
                            </p>
                        </div>
                    ) : (
                        summariesData.summaries.map((summary) => {
                            const dailyCups = getCupsCountForDate(
                                summariesData,
                                summary.date
                            );
                            const dailyOrders = getOrdersCountForDate(
                                summariesData,
                                summary.date
                            );
                            const dailyExpenses = getExpensesForDate(
                                summariesData,
                                summary.date
                            );

                            return (
                                <div
                                    key={summary.id}
                                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                                >
                                    <div className="p-3 bg-white space-y-3">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setShowDetailsModal(
                                                            true
                                                        );
                                                    }}
                                                    className="text-left hover:text-blue-600 transition-colors"
                                                >
                                                    <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600">
                                                        {formatDate(
                                                            summary.date
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-blue-600 underline">
                                                        Tap for details
                                                    </p>
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                {summary.closed_at ? (
                                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        Closed
                                                    </span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                                        Open
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                            Summary of the Day
                                        </h4>

                                        <div className="grid grid-cols-2 gap-2 rounded-lg border-1 p-2 border-gray-200 bg-gray-50 text-gray-800">
                                            <div>
                                                <p className="text-xs">
                                                    Opening Balance
                                                </p>
                                                <p className="text-lg font-semibold text-blue-600">
                                                    {formatRupiah(
                                                        summary.opening_balance
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">
                                                    Total Sales
                                                </p>
                                                <p className="text-lg font-bold text-green-600">
                                                    {formatRupiah(
                                                        summary.total_sales
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">
                                                    Opening + Sales
                                                </p>
                                                <p className="text-lg font-semibold text-purple-600">
                                                    {formatRupiah(
                                                        summary.opening_balance +
                                                            summary.total_sales
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <p className="text-xs">
                                                        Orders
                                                    </p>
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {dailyOrders}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs">
                                                        Cups
                                                    </p>
                                                    <p className="text-lg font-bold text-orange-600">
                                                        {dailyCups}
                                                    </p>
                                                </div>
                                            </div>
                                            <hr className="col-span-2 border-gray-300" />
                                            <div>
                                                <p className="text-xs">
                                                    Net Expected Cash
                                                </p>
                                                <p className="text-lg font-semibold text-purple-600">
                                                    {formatRupiah(
                                                        summary.expected_cash
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs">
                                                    Actual Cash (Counted)
                                                </p>
                                                <p className="text-lg font-semibold text-orange-600">
                                                    {summary.actual_cash !==
                                                    null
                                                        ? formatRupiah(
                                                              summary.actual_cash
                                                          )
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
                                                    {dailyExpenses.map(
                                                        (expense, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex justify-between text-sm"
                                                            >
                                                                <span className="text-red-700">
                                                                    {
                                                                        expense.expense_type
                                                                    }
                                                                </span>
                                                                <span className="font-medium text-red-800">
                                                                    -
                                                                    {formatRupiah(
                                                                        expense.amount
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                    <div className="border-t border-red-300 mt-1 pt-1 flex justify-between font-medium">
                                                        <span className="text-red-700">
                                                            Total
                                                        </span>
                                                        <span className="text-red-800">
                                                            -
                                                            {formatRupiah(
                                                                dailyExpenses.reduce(
                                                                    (
                                                                        sum,
                                                                        exp
                                                                    ) =>
                                                                        sum +
                                                                        exp.amount,
                                                                    0
                                                                )
                                                            )}
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
                                                    {summary.variance >= 0
                                                        ? "+"
                                                        : ""}
                                                    {formatRupiah(
                                                        summary.variance
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {summary.notes && (
                                            <div>
                                                <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                    Notes
                                                </h4>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border-1 border-gray-200">
                                                    {summary.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {!summary.closed_at && (
                                        <div className="border-t border-gray-100 p-3 bg-gray-50">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setShowEditForm(true);
                                                    }}
                                                    className="flex-1 bg-white text-blue-500 border border-blue-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100"
                                                >
                                                    Balance
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setShowExpenseForm(
                                                            true
                                                        );
                                                    }}
                                                    className="flex-1 bg-white text-green-500 border border-green-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100"
                                                >
                                                    Expenses
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setShowCloseForm(true);
                                                    }}
                                                    className="flex-1 bg-red-500 text-white border border-red-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
                                                >
                                                    Close Day
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modals */}
            <ConfirmationPopup
                isOpen={showOpenStorePopup}
                title="Open Store Today"
                message={`Open '${getStoreName()}' Store for ${new Date().toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    }
                )}? This will create a new daily summary.`}
                confirmText="Open Store"
                onConfirm={handleOpenStoreToday}
                onCancel={() => {
                    setShowOpenStorePopup(false);
                    setHasSeenPopup(true);
                }}
            />

            <ConfirmationPopup
                isOpen={showCloseReminder}
                title="Close Day Reminder"
                message="Don't forget to close the day and count the cash before ending your shift. This ensures accurate financial records."
                confirmText="Close Now"
                cancelText="Remind Later"
                type="warning"
                onConfirm={() => {
                    if (todaysSummary) {
                        setSelectedSummary(todaysSummary);
                        setShowCloseForm(true);
                        setShowCloseReminder(false);
                    }
                }}
                onCancel={() => {
                    setShowCloseReminder(false);
                    setHasSeenCloseReminder(true);
                }}
            />

            {selectedSummary && (
                <>
                    {selectedSummary &&
                        "seller" in selectedSummary &&
                        "manager" in selectedSummary && (
                            <DetailsModal
                                isOpen={showDetailsModal}
                                summary={
                                    selectedSummary as DailySummaryWithExpenses
                                }
                                onClose={() => {
                                    setShowDetailsModal(false);
                                    setSelectedSummary(null);
                                }}
                                productBreakdown={getProductBreakdownForDate(
                                    summariesData,
                                    selectedSummary.date
                                )}
                                dailyOrders={getOrdersCountForDate(
                                    summariesData,
                                    selectedSummary.date
                                )}
                                storeName={getStoreName()}
                            />
                        )}

                    <SetBalanceModal
                        isOpen={showEditForm}
                        summary={selectedSummary}
                        onClose={() => {
                            setShowEditForm(false);
                            setSelectedSummary(null);
                        }}
                        onSubmit={handleBalanceSubmit}
                        formatDate={formatDate}
                        getStoreName={getStoreName}
                    />

                    <SetExpenseModal
                        isOpen={showExpenseForm}
                        summary={selectedSummary}
                        onClose={() => {
                            setShowExpenseForm(false);
                            setSelectedSummary(null);
                        }}
                        onSubmit={handleExpenseSubmit}
                        formatDate={formatDate}
                        getStoreName={getStoreName}
                    />

                    <CloseDayModal
                        isOpen={showCloseForm}
                        summary={selectedSummary}
                        onClose={() => {
                            setShowCloseForm(false);
                            setSelectedSummary(null);
                        }}
                        onSubmit={handleCloseDaySubmit}
                        formatDate={formatDate}
                        getStoreName={getStoreName}
                    />
                </>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                        toast.type === "success"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                    }`}
                >
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-4 text-white hover:opacity-75"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
