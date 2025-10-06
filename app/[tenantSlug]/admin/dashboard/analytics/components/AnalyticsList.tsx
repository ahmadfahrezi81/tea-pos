// dashboard/analytics/components/AnalyticsList.tsx
import React from "react";
import { DailySummary, ProductBreakdown, Expense } from "../types/analytics";
import {
    Calendar,
    RefreshCw,
    DollarSign,
    XCircle,
    User,
    Store,
} from "lucide-react";

interface AnalyticsListProps {
    summaries: DailySummary[];
    onEditBalance: (summary: DailySummary) => void;
    onAddExpense: (summary: DailySummary) => void;
    onCloseDay: (summary: DailySummary) => void;
    onRefreshSales: (summary: DailySummary) => void;
    getProductBreakdown: (date: string) => ProductBreakdown;
    getOrdersCount: (date: string) => number;
    getExpenses: (date: string) => Expense[];
}

export const AnalyticsList: React.FC<AnalyticsListProps> = ({
    summaries,
    onEditBalance,
    onAddExpense,
    onCloseDay,
    onRefreshSales,
    getProductBreakdown,
    getOrdersCount,
    getExpenses,
}) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year:
                    date.getFullYear() !== today.getFullYear()
                        ? "numeric"
                        : undefined,
            });
        }
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getCupsCount = (date: string) => {
        const breakdown = getProductBreakdown(date);
        return Object.values(breakdown).reduce(
            (total, product) => total + product.quantity,
            0
        );
    };

    if (summaries.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg mb-2">
                    No daily summaries found
                </p>
                <p className="text-gray-400 text-sm">
                    Try adjusting your filters or create a new daily summary
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {summaries.map((summary) => {
                const dailyCups = getCupsCount(summary.date);
                const dailyOrders = getOrdersCount(summary.date);
                const dailyExpenses = getExpenses(summary.date);

                return (
                    <div
                        key={summary.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 bg-white">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-xl font-semibold text-gray-800">
                                            {formatDate(summary.date)}
                                        </h3>
                                        <span className="text-sm text-gray-500">
                                            (
                                            {new Date(
                                                summary.date
                                            ).toLocaleDateString()}
                                            )
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <Store className="w-4 h-4" />
                                            <span>{summary.stores?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            <span>
                                                Seller:{" "}
                                                {summary.seller?.full_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {summary.closed_at ? (
                                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                                            Closed
                                        </span>
                                    ) : (
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                            Open
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Financial Summary Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-blue-600 font-medium">
                                        Opening Balance
                                    </p>
                                    <p className="text-xl font-bold text-blue-700">
                                        {formatRupiah(summary.opening_balance)}
                                    </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">
                                        Total Sales
                                    </p>
                                    <p className="text-xl font-bold text-green-700">
                                        {formatRupiah(summary.total_sales)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-purple-600 font-medium">
                                        Expected Cash
                                    </p>
                                    <p className="text-xl font-bold text-purple-700">
                                        {formatRupiah(summary.expected_cash)}
                                    </p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg">
                                    <p className="text-sm text-orange-600 font-medium">
                                        Actual Cash
                                    </p>
                                    {summary.actual_cash !== null ? (
                                        <p className="text-xl font-bold text-orange-700">
                                            {formatRupiah(summary.actual_cash)}
                                        </p>
                                    ) : (
                                        <p className="text-lg text-gray-400 italic">
                                            Not counted
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Activity Summary */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Orders
                                            </p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {dailyOrders}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Cups
                                            </p>
                                            <p className="text-2xl font-bold text-orange-600">
                                                {dailyCups}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        Summary ID
                                    </p>
                                    <p className="text-xs font-mono text-gray-500 break-all">
                                        {summary.id}
                                    </p>
                                </div>
                            </div>

                            {/* Expenses */}
                            {dailyExpenses.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                        Daily Expenses
                                    </h4>
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                        <div className="space-y-2">
                                            {dailyExpenses.map(
                                                (expense, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex justify-between items-center text-sm"
                                                    >
                                                        <span className="text-red-700 font-medium">
                                                            {
                                                                expense.expense_type
                                                            }
                                                        </span>
                                                        <span className="font-semibold text-red-800">
                                                            -
                                                            {formatRupiah(
                                                                expense.amount
                                                            )}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        <div className="border-t border-red-300 mt-3 pt-3 flex justify-between font-semibold">
                                            <span className="text-red-700">
                                                Total Expenses
                                            </span>
                                            <span className="text-red-800">
                                                -
                                                {formatRupiah(
                                                    dailyExpenses.reduce(
                                                        (sum, exp) =>
                                                            sum + exp.amount,
                                                        0
                                                    )
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Variance */}
                            {summary.variance !== null && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                        Cash Variance
                                    </h4>
                                    <div
                                        className={`p-4 rounded-lg ${
                                            summary.variance >= 0
                                                ? "bg-green-50 border border-green-200"
                                                : "bg-red-50 border border-red-200"
                                        }`}
                                    >
                                        <p
                                            className={`text-2xl font-bold ${
                                                summary.variance >= 0
                                                    ? "text-green-700"
                                                    : "text-red-700"
                                            }`}
                                        >
                                            {summary.variance >= 0 ? "+" : ""}
                                            {formatRupiah(summary.variance)}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {summary.variance >= 0
                                                ? "Surplus"
                                                : "Deficit"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {summary.notes && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                        Notes
                                    </h4>
                                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                                        <p className="text-gray-700">
                                            {summary.notes}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons - Only show for open days */}
                        {!summary.closed_at && (
                            <div className="border-t border-gray-100 p-6 bg-gray-50">
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => onRefreshSales(summary)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Refresh Sales
                                    </button>
                                    <button
                                        onClick={() => onEditBalance(summary)}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Edit Balance
                                    </button>
                                    <button
                                        onClick={() => onAddExpense(summary)}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Add Expense
                                    </button>
                                    <button
                                        onClick={() => onCloseDay(summary)}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Close Day
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Closed Day Info */}
                        {summary.closed_at && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50">
                                <div className="text-sm text-gray-600">
                                    <strong>Closed:</strong>{" "}
                                    {new Date(
                                        summary.closed_at
                                    ).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
