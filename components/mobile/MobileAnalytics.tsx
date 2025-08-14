"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";
import { Profile } from "@/lib/types";
import {
    Plus,
    RefreshCw,
    X,
    Calendar,
    DollarSign,
    TrendingUp,
    AlertCircle,
} from "lucide-react";

interface DailySummary {
    id: string;
    store_id: string;
    seller_id: string;
    manager_id: string | null;
    date: string;
    opening_balance: number;
    total_sales: number;
    expected_cash: number;
    actual_cash: number | null;
    variance: number | null;
    closed_at: string | null;
    notes: string | null;
    created_at: string;
    stores?: { name: string };
    seller?: { full_name: string };
}

interface MobileAnalyticsProps {
    profile: Profile | null;
}

export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [showOpeningForm, setShowOpeningForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
        null
    );
    const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const [openingForm, setOpeningForm] = useState({
        store_id: "",
        seller_id: "",
        opening_balance: "",
        date: "",
    });
    const [closeForm, setCloseForm] = useState({
        actual_cash: "",
        notes: "",
    });

    const supabase = createClient();
    const {
        stores = [],
        sellers = [],
        summaries = [],
        isLoading,
        mutate,
    } = useAnalyticsData(selectedStore, selectedDate);

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const calculateTotalSales = async (storeId: string, date: string) => {
        const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("store_id", storeId)
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${date}T23:59:59`);

        return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    };

    const handleOpeningSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existing } = await supabase
                .from("daily_summaries")
                .select("id")
                .eq("store_id", openingForm.store_id)
                .eq("date", openingForm.date)
                .single();

            if (existing) {
                showToast(
                    "Daily summary already exists for this store and date",
                    "error"
                );
                return;
            }

            const totalSales = await calculateTotalSales(
                openingForm.store_id,
                openingForm.date
            );
            const openingBalance = parseFloat(openingForm.opening_balance);
            const expectedCash = openingBalance + totalSales;

            const { error } = await supabase.from("daily_summaries").insert({
                store_id: openingForm.store_id,
                seller_id: openingForm.seller_id,
                manager_id: user.id,
                date: openingForm.date,
                opening_balance: openingBalance,
                total_sales: totalSales,
                expected_cash: expectedCash,
            });

            if (error) throw error;

            showToast("Daily summary created successfully", "success");
            setOpeningForm({
                store_id: "",
                seller_id: "",
                opening_balance: "",
                date: "",
            });
            setShowOpeningForm(false);
            mutate();
        } catch (error) {
            showToast("Failed to create daily summary", "error");
            console.error(error);
        }
    };

    const handleCloseDay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary) return;

        try {
            const actualCash = parseFloat(closeForm.actual_cash);
            const variance = actualCash - selectedSummary.expected_cash;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    actual_cash: actualCash,
                    variance: variance,
                    notes: closeForm.notes || null,
                    closed_at: new Date().toISOString(),
                })
                .eq("id", selectedSummary.id);

            if (error) throw error;

            showToast("Day closed successfully", "success");
            setCloseForm({ actual_cash: "", notes: "" });
            setShowCloseForm(false);
            setSelectedSummary(null);
            mutate();
        } catch (error) {
            showToast("Failed to close day", "error");
            console.error(error);
        }
    };

    const refreshSales = async (summary: DailySummary) => {
        try {
            const totalSales = await calculateTotalSales(
                summary.store_id,
                summary.date
            );
            const expectedCash = summary.opening_balance + totalSales;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    total_sales: totalSales,
                    expected_cash: expectedCash,
                })
                .eq("id", summary.id);

            if (error) throw error;

            showToast("Sales refreshed successfully", "success");
            mutate();
        } catch (error) {
            showToast("Failed to refresh sales", "error");
            console.error(error);
        }
    };

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
                month: "short",
                day: "numeric",
                year:
                    date.getFullYear() !== today.getFullYear()
                        ? "numeric"
                        : undefined,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Store and Date Selection */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store
                    </label>
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select a store...</option>
                        {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date (Last 7 days from)
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    onClick={() => setShowOpeningForm(true)}
                    disabled={!selectedStore}
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <Plus size={20} className="mr-2" />
                    Set Opening Balance
                </button>
            </div>

            {/* Daily Summaries */}
            {selectedStore && (
                <div className="space-y-3">
                    {summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <Calendar
                                size={48}
                                className="mx-auto text-gray-400 mb-4"
                            />
                            <p className="text-gray-600">
                                No daily summaries found
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Create an opening balance to get started
                            </p>
                        </div>
                    ) : (
                        summaries.map((summary) => (
                            <div
                                key={summary.id}
                                className="bg-white rounded-lg shadow-sm overflow-hidden"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() =>
                                        setExpandedSummary(
                                            expandedSummary === summary.id
                                                ? null
                                                : summary.id
                                        )
                                    }
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">
                                                {formatDate(summary.date)}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {summary.seller?.full_name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {summary.closed_at ? (
                                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                    Closed
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                    Open
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Sales
                                            </p>
                                            <p className="text-lg font-bold text-green-600">
                                                $
                                                {summary.total_sales.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Expected
                                            </p>
                                            <p className="text-lg font-bold text-blue-600">
                                                $
                                                {summary.expected_cash.toFixed(
                                                    2
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {summary.variance !== null && (
                                        <div className="mt-2">
                                            <p
                                                className={`text-sm font-medium ${
                                                    summary.variance >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                Variance: $
                                                {summary.variance >= 0
                                                    ? "+"
                                                    : ""}
                                                {summary.variance.toFixed(2)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Details */}
                                {expandedSummary === summary.id && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Opening Balance
                                                </p>
                                                <p className="font-semibold">
                                                    $
                                                    {summary.opening_balance.toFixed(
                                                        2
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Actual Cash
                                                </p>
                                                <p className="font-semibold">
                                                    {summary.actual_cash !==
                                                    null
                                                        ? `$${summary.actual_cash.toFixed(
                                                              2
                                                          )}`
                                                        : "Not counted"}
                                                </p>
                                            </div>
                                        </div>

                                        {summary.notes && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Notes
                                                </p>
                                                <p className="text-sm text-gray-700 bg-white p-2 rounded">
                                                    {summary.notes}
                                                </p>
                                            </div>
                                        )}

                                        {summary.closed_at && (
                                            <div className="text-xs text-gray-500">
                                                Closed:{" "}
                                                {new Date(
                                                    summary.closed_at
                                                ).toLocaleString()}
                                            </div>
                                        )}

                                        {!summary.closed_at && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        refreshSales(summary);
                                                    }}
                                                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center"
                                                >
                                                    <RefreshCw
                                                        size={16}
                                                        className="mr-1"
                                                    />
                                                    Refresh
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setCloseForm({
                                                            actual_cash:
                                                                summary.expected_cash.toString(),
                                                            notes: "",
                                                        });
                                                        setShowCloseForm(true);
                                                    }}
                                                    className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
                                                >
                                                    Close Day
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Opening Balance Modal */}
            {showOpeningForm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowOpeningForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold">
                                Set Opening Balance
                            </h2>
                            <button
                                onClick={() => setShowOpeningForm(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleOpeningSubmit}
                            className="p-4 space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Store
                                </label>
                                <select
                                    value={openingForm.store_id}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            store_id: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select store...</option>
                                    {stores.map((store) => (
                                        <option key={store.id} value={store.id}>
                                            {store.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seller
                                </label>
                                <select
                                    value={openingForm.seller_id}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            seller_id: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select seller...</option>
                                    {sellers.map((seller) => (
                                        <option
                                            key={seller.id}
                                            value={seller.id}
                                        >
                                            {seller.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={openingForm.date}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            date: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Opening Balance
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={openingForm.opening_balance}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            opening_balance: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600"
                            >
                                Create Opening Balance
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Day Modal */}
            {showCloseForm && selectedSummary && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowCloseForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Close Day</h2>
                            <button
                                onClick={() => setShowCloseForm(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="font-medium text-blue-800">
                                    Expected Cash
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    ${selectedSummary.expected_cash.toFixed(2)}
                                </p>
                                <p className="text-sm text-blue-600">
                                    Opening: $
                                    {selectedSummary.opening_balance.toFixed(2)}{" "}
                                    + Sales: $
                                    {selectedSummary.total_sales.toFixed(2)}
                                </p>
                            </div>

                            <form
                                onSubmit={handleCloseDay}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Actual Cash Count
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={closeForm.actual_cash}
                                        onChange={(e) =>
                                            setCloseForm({
                                                ...closeForm,
                                                actual_cash: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={closeForm.notes}
                                        onChange={(e) =>
                                            setCloseForm({
                                                ...closeForm,
                                                notes: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
                                        placeholder="Any notes about the day..."
                                    />
                                </div>

                                {closeForm.actual_cash && (
                                    <div
                                        className={`p-4 rounded-lg ${
                                            parseFloat(closeForm.actual_cash) -
                                                selectedSummary.expected_cash >=
                                            0
                                                ? "bg-green-50"
                                                : "bg-red-50"
                                        }`}
                                    >
                                        <p className="font-medium">
                                            Variance: $
                                            {(
                                                parseFloat(
                                                    closeForm.actual_cash
                                                ) -
                                                selectedSummary.expected_cash
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600"
                                >
                                    Close Day
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
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
