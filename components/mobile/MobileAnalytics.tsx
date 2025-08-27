//components/mobile/MobileAnalytics.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSummaries } from "@/lib/hooks/useSummaries";
import { useStores } from "@/lib/hooks/useData";
import { Profile, Store } from "@/lib/types";
import {
    X,
    Calendar,
    StoreIcon,
    CalendarDays,
    AlertTriangle,
    CheckCircle,
    Receipt,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { Assignment } from "@/app/mobile/page";
import { hasManagerRoleInStore } from "@/lib/utils/roleUtils";

interface MobileAnalyticsProps {
    profile: Profile | null;
}

interface ConfirmationPopupProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "warning" | "info";
}

interface DetailsModalProps {
    isOpen: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: any;
    onClose: () => void;
    productBreakdown: Record<string, { quantity: number; revenue: number }>;
    storeName: string;
}

// Reusable Confirmation Popup Component
const ConfirmationPopup = ({
    isOpen,
    title,
    message,
    confirmText,
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    type = "info",
}: ConfirmationPopupProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-6">
                <div className="flex items-center mb-4">
                    {type === "warning" && (
                        <AlertTriangle
                            className="text-orange-500 mr-2"
                            size={24}
                        />
                    )}
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2 px-4 rounded-lg text-white font-medium ${
                            type === "warning"
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Details Modal Component
const DetailsModal = ({
    isOpen,
    summary,
    onClose,
    productBreakdown,
    storeName,
}: DetailsModalProps) => {
    if (!isOpen || !summary) return null;

    const formatFullTimestamp = (dateString: string) => {
        if (!dateString) return "Not set";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    const dailyCups = Object.values(productBreakdown).reduce(
        (total, product) => total + product.quantity,
        0
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">
                        Daily Summary Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Summary Header */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">
                            {new Date(summary.date).toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }
                            )}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>
                                <strong>Summary ID:</strong> {summary.id}
                            </p>
                            <p>
                                <strong>Store:</strong> {storeName}
                            </p>
                            <p>
                                <strong>Seller:</strong>{" "}
                                {summary.seller?.full_name}
                            </p>
                            {summary.manager?.full_name && (
                                <p>
                                    <strong>Manager:</strong>{" "}
                                    {summary.manager.full_name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-xs text-blue-600 uppercase tracking-wide">
                                Opening Balance
                            </p>
                            <p className="text-lg font-bold text-blue-800">
                                {formatRupiah(summary.opening_balance)}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-xs text-green-600 uppercase tracking-wide">
                                Total Sales
                            </p>
                            <p className="text-lg font-bold text-green-800">
                                {formatRupiah(summary.total_sales)}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-xs text-purple-600 uppercase tracking-wide">
                                Expected Cash
                            </p>
                            <p className="text-lg font-bold text-purple-800">
                                {formatRupiah(summary.expected_cash)}
                            </p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-xs text-orange-600 uppercase tracking-wide">
                                Actual Cash
                            </p>
                            <p className="text-lg font-bold text-orange-800">
                                {summary.actual_cash !== null
                                    ? formatRupiah(summary.actual_cash)
                                    : "Not counted"}
                            </p>
                        </div>
                    </div>

                    {/* Variance */}
                    {summary.variance !== null && (
                        <div
                            className={`p-4 rounded-lg ${
                                summary.variance >= 0
                                    ? "bg-green-50"
                                    : "bg-red-50"
                            }`}
                        >
                            <p
                                className={`text-xs uppercase tracking-wide ${
                                    summary.variance >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                }`}
                            >
                                Cash Variance
                            </p>
                            <p
                                className={`text-lg font-bold ${
                                    summary.variance >= 0
                                        ? "text-green-800"
                                        : "text-red-800"
                                }`}
                            >
                                {summary.variance >= 0 ? "+" : ""}
                                {formatRupiah(summary.variance)}
                            </p>
                        </div>
                    )}

                    {/* Sales Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                                {Object.keys(productBreakdown).length}
                            </p>
                            <p className="text-sm text-gray-600">
                                Total Orders
                            </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                                {dailyCups}
                            </p>
                            <p className="text-sm text-gray-600">Cups Sold</p>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-800">
                            Timestamps
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium">
                                    {formatFullTimestamp(summary.created_at)}
                                </span>
                            </div>
                            {summary.closed_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Closed:
                                    </span>
                                    <span className="font-medium">
                                        {formatFullTimestamp(summary.closed_at)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Breakdown */}
                    {Object.keys(productBreakdown).length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-800">
                                Product Sales
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(productBreakdown).map(
                                    ([productName, data]) => (
                                        <div
                                            key={productName}
                                            className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                                        >
                                            <span className="font-medium">
                                                {productName}
                                            </span>
                                            <div className="text-right">
                                                <p className="font-medium">
                                                    {data.quantity} cups
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {formatRupiah(data.revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {summary.notes && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-800">Notes</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    {summary.notes}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const isCurrentMonthSelected = (selectedMonth: string): boolean => {
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    return selectedMonth === currentMonth;
};

export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7)
    );
    const [showOpenStorePopup, setShowOpenStorePopup] = useState(false);
    const [showCloseReminder, setShowCloseReminder] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedSummary, setSelectedSummary] = useState<any>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const [editForm, setEditForm] = useState({
        opening_balance: "",
    });
    const [closeForm, setCloseForm] = useState({
        actual_cash: "",
        notes: "",
    });

    const { data: storesData, isLoading: storesLoading } = useStores(
        profile?.id ?? ""
    );
    const stores = storesData?.stores ?? [];
    const assignments = storesData?.assignments ?? {};

    const managerStores = stores.filter((store: Store) =>
        hasManagerRoleInStore(profile?.id ?? "", store.id, assignments)
    );

    const defaultStore = stores.find((store: Store) =>
        assignments[store.id]?.some(
            (assignment: Assignment) =>
                assignment.user_id === profile?.id && assignment.is_default
        )
    );

    const { data, isLoading, error, createSummary, updateSummary } =
        useSummaries(selectedStore, selectedMonth);

    const isManager = profile?.role === "manager";

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auto-select first store when stores are loaded
    useEffect(() => {
        if (defaultStore && !selectedStore) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, storesData]);

    const getStoreName = () =>
        stores.find((store: Store) => store.id === selectedStore)?.name ||
        "Unknown Store";

    // This new useEffect for open store reminder
    useEffect(() => {
        if (!isManager || !selectedStore || !data?.summaries) return;

        if (!isCurrentMonthSelected(selectedMonth)) {
            setShowOpenStorePopup(false);
            return;
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const todaysSummary = data.summaries.find((s) => s.date === todayStr);

        if (!todaysSummary) {
            setShowOpenStorePopup(true);
        } else {
            setShowOpenStorePopup(false);
        }
    }, [isManager, selectedStore, data?.summaries, selectedMonth]);

    // Closed store reminder useEffect
    const getUnclosedSummaries = useCallback(() => {
        if (!data?.summaries) return [];
        return data.summaries.filter((s) => !s.closed_at);
    }, [data?.summaries]);

    // Close day reminder logic - check every hour after 10 PM
    useEffect(() => {
        if (!isManager || !data?.summaries || !selectedStore) return;

        const unclosedSummaries = getUnclosedSummaries();
        const todayStr = new Date().toISOString().split("T")[0];
        const todaysSummary = data.summaries.find((s) => s.date === todayStr);

        if (todaysSummary && unclosedSummaries.length > 0) {
            const now = new Date();
            const hour = now.getHours();
            if (hour >= 22 || hour < 6) {
                setShowCloseReminder(true);
            }
        }
    }, [isManager, data?.summaries, selectedStore, getUnclosedSummaries]);

    const handleOpenStoreToday = async () => {
        if (!selectedStore || !profile) return;

        try {
            const todayStr = new Date().toISOString().split("T")[0];

            await createSummary({
                storeId: selectedStore,
                sellerId: profile.id, // Current user as seller
                managerId: isManager ? profile.id : "", // Set manager if current user is manager
                date: todayStr,
                openingBalance: 0,
            });

            setShowOpenStorePopup(false);
            showToast("Store opened for today", "success");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            showToast(error.message || "Failed to open store", "error");
            console.error(error);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary || !isManager) return;

        try {
            const openingBalance = parseFloat(editForm.opening_balance);

            await updateSummary(selectedSummary.id, {
                opening_balance: openingBalance,
            });

            showToast("Opening balance updated successfully", "success");
            setEditForm({ opening_balance: "" });
            setShowEditForm(false);
            setSelectedSummary(null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            showToast(
                error.message || "Failed to update opening balance",
                "error"
            );
            console.error(error);
        }
    };

    const handleCloseDay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary || !isManager) return;

        try {
            const actualCash = parseFloat(closeForm.actual_cash);
            const variance = actualCash - selectedSummary.expected_cash;

            await updateSummary(selectedSummary.id, {
                actual_cash: actualCash,
                variance: variance,
                notes: closeForm.notes || null,
                closed_at: new Date().toISOString(),
            });

            showToast("Day closed successfully", "success");
            setCloseForm({ actual_cash: "", notes: "" });
            setShowCloseForm(false);
            setShowCloseReminder(false);
            setSelectedSummary(null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            showToast(error.message || "Failed to close day", "error");
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

    const getTodaysSummary = () => {
        const todayStr = new Date().toISOString().split("T")[0];
        return data?.summaries.find((summary) => summary.date === todayStr);
    };

    const getProductBreakdownForDate = (date: string) => {
        return data?.productBreakdown[date] || {};
    };

    const getCupsCountForDate = (date: string) => {
        const breakdown = getProductBreakdownForDate(date);
        return Object.values(breakdown).reduce(
            (total, product) => total + product.quantity,
            0
        );
    };

    const getOrdersCountForDate = (date: string) => {
        return data?.ordersByDate?.[date]?.length || 0;
    };

    if (isLoading || storesLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
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

    const todaysSummary = getTodaysSummary();

    return (
        <div className="space-y-4">
            {/* Monthly Summary Section */}
            {data?.monthlyTotals && (
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
                                {data.monthlyTotals.totalOrders}
                            </p>
                            <p className="text-sm text-gray-600">Orders</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-orange-600">
                                {data.monthlyTotals.totalCups}
                            </p>
                            <p className="text-sm text-gray-600">Cups</p>
                        </div>
                        <div className="text-center col-span-2 border-l-2 border-gray-300">
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="text-xl font-bold text-green-600">
                                {formatRupiah(data.monthlyTotals.totalSales)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Unclosed Days Warning */}
            {isManager && getUnclosedSummaries().length > 1 && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={20} className="text-red-600" />
                        <h3 className="font-semibold text-red-800">
                            {getUnclosedSummaries().length - 1} Overdue Unclosed
                            Day(s)
                        </h3>
                    </div>
                    <p className="text-sm text-red-700 mb-2">
                        Please close these days to maintain accurate financial
                        records.
                    </p>
                    {/* <button
                        onClick={() => setShowCloseReminder(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                        Review Unclosed Days
                    </button> */}
                </div>
            )}

            {/* Open Store Today Button - Only show if manager and store not opened */}
            {isManager &&
                !todaysSummary &&
                isCurrentMonthSelected(selectedMonth) && (
                    <div className="bg-green-50 border border-green-200 p-3.5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={20} className="text-green-600" />
                            <h3 className="font-semibold text-green-800">
                                Open store Today for{" "}
                                {
                                    stores.find(
                                        (store: Store) =>
                                            store.id === selectedStore
                                    )?.name
                                }
                            </h3>
                        </div>
                        <p className="text-sm text-green-700 mb-2">
                            Opening the store will initialize a summary with
                            zero balances.
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

            {/* Store and Month Selection */}
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
                            {managerStores.map((store: Store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {selectedStore && (
                <div className="space-y-3">
                    {/* Daily Summary Cards */}
                    <div className="bg-gray-50 rounded-lg space-y-3">
                        {!data?.summaries || data.summaries.length === 0 ? (
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
                            data.summaries.map((summary) => {
                                // const productBreakdown =
                                //     getProductBreakdownForDate(summary.date);
                                const dailyCups = getCupsCountForDate(
                                    summary.date
                                );
                                const dailyOrders = getOrdersCountForDate(
                                    summary.date
                                );

                                return (
                                    <div
                                        key={summary.id}
                                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                                    >
                                        {/* Summary Header */}
                                        <div className="p-3.5 bg-white">
                                            <div className="flex justify-between items-start mb-4">
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
                                                        {/* <p className="text-sm text-gray-500">
                                                            {
                                                                summary.seller
                                                                    ?.full_name
                                                            }
                                                        </p> */}
                                                        <p className="text-xs text-blue-600 underline">
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

                                            {/* Cash Balances */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Opening Balance
                                                    </p>
                                                    <p className="text-lg font-semibold text-blue-600">
                                                        {formatRupiah(
                                                            summary.opening_balance
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Actual Cash
                                                    </p>
                                                    <p className="text-lg font-semibold text-purple-600">
                                                        {summary.actual_cash !==
                                                        null
                                                            ? formatRupiah(
                                                                  summary.actual_cash
                                                              )
                                                            : "Not counted"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Daily Totals */}
                                            <div className="grid grid-cols-4 gap-4 mb-4">
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">
                                                        Sales
                                                    </p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        {formatRupiah(
                                                            summary.total_sales
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Orders
                                                    </p>
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {/* {
                                                            Object.keys(
                                                                productBreakdown
                                                            ).length
                                                        } */}
                                                        {dailyOrders}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Cups
                                                    </p>
                                                    <p className="text-lg font-bold text-orange-600">
                                                        {dailyCups}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Variance */}
                                            {summary.variance !== null && (
                                                <div className="mb-4">
                                                    <p className="text-xs mb-1">
                                                        Variance
                                                    </p>
                                                    <p
                                                        className={`text-sm px-3 py-2 rounded font-medium ${
                                                            summary.variance >=
                                                            0
                                                                ? "bg-green-600 text-white"
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

                                            {/* Notes */}
                                            {summary.notes && (
                                                <div>
                                                    <p className="text-xs mb-1">
                                                        Notes
                                                    </p>
                                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                                        {summary.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Manager Actions */}
                                        {isManager && !summary.closed_at && (
                                            <div className="border-t border-gray-100 p-3 bg-gray-50">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setEditForm({
                                                                opening_balance:
                                                                    summary.opening_balance.toString(),
                                                            });
                                                            setShowEditForm(
                                                                true
                                                            );
                                                        }}
                                                        className="flex-1 bg-white text-blue-500 border border-blue-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center"
                                                    >
                                                        Set Balance
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setCloseForm({
                                                                actual_cash:
                                                                    summary.expected_cash.toString(),
                                                                notes: "",
                                                            });
                                                            setShowCloseForm(
                                                                true
                                                            );
                                                        }}
                                                        // className="flex-1 bg-white text-red-500 border border-red-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-50"
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
                </div>
            )}

            {/* Open Store Confirmation Popup */}
            <ConfirmationPopup
                isOpen={showOpenStorePopup}
                // title="Open Store Today"
                // message={`Are you sure you want to open ${
                //     stores.find((s) => s.id === selectedStore)?.name
                // } for today? This will create a new daily summary with zero opening balance.`}
                title="Open Store for Today"
                message={`Open ${getStoreName()} for ${new Date().toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }
                )}? This will create a new daily summary.`}
                confirmText="Open Store"
                onConfirm={handleOpenStoreToday}
                onCancel={() => setShowOpenStorePopup(false)}
            />

            {/* Close Day Reminder Popup */}
            <ConfirmationPopup
                isOpen={showCloseReminder}
                title="Close Day Reminder"
                message="Don't forget to close the day and count the cash before ending your shift. This ensures accurate financial records."
                confirmText="Close Now"
                // title={`${getUnclosedSummaries().length} Unclosed Day(s)`}
                // message={`You have ${
                //     getUnclosedSummaries().length
                // } unclosed day(s) at ${getStoreName()}. Please close them to ensure accurate records.`}
                // confirmText="Review & Close"
                cancelText="Remind Later"
                onConfirm={() => {
                    const todaysSummary = getTodaysSummary();
                    if (todaysSummary) {
                        setSelectedSummary(todaysSummary);
                        setCloseForm({
                            actual_cash: todaysSummary.expected_cash.toString(),
                            notes: "",
                        });
                        setShowCloseForm(true);
                        setShowCloseReminder(false);
                    }
                }}
                onCancel={() => setShowCloseReminder(false)}
                type="warning"
            />

            {/* Details Modal */}
            <DetailsModal
                isOpen={showDetailsModal}
                summary={selectedSummary}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedSummary(null);
                }}
                productBreakdown={
                    selectedSummary
                        ? getProductBreakdownForDate(selectedSummary.date)
                        : {}
                }
                storeName={
                    stores.find((store: Store) => store.id === selectedStore)
                        ?.name || "Unknown Store"
                }
            />

            {/* Edit Opening Balance Modal */}
            {showEditForm && selectedSummary && isManager && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowEditForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            {/* <h2 className="text-lg font-semibold">
                                Edit Opening Balance
                            </h2> */}

                            <div className="flex flex-col space-y-1">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Set Opening Balance
                                </h2>
                                <p className="text-sm text-gray-600">
                                    {formatDate(selectedSummary.date)} ·{" "}
                                    {getStoreName()}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowEditForm(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleEditSubmit}
                            className="p-4 space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Opening Balance
                                </label>
                                <input
                                    type="number"
                                    step="100"
                                    inputMode="numeric"
                                    min={0}
                                    value={editForm.opening_balance}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            opening_balance: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will update the expected cash
                                    automatically
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-500 text-white py-4 mb-4 rounded-xl font-semibold hover:bg-blue-600"
                            >
                                Update Opening Balance
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Day Modal */}
            {showCloseForm && selectedSummary && isManager && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowCloseForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            {/* <h2 className="text-lg font-semibold">Close Day</h2> */}
                            {/* <h2 className="text-lg font-semibold">
                                Close Day - {formatDate(selectedSummary.date)}{" "}
                                at {getStoreName()}
                            </h2> */}
                            <div className="flex flex-col space-y-1">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Close Day
                                </h2>
                                <p className="text-sm text-gray-600">
                                    {formatDate(selectedSummary.date)} ·{" "}
                                    {getStoreName()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCloseForm(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="font-medium text-blue-800">
                                    Expected Cash
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatRupiah(
                                        selectedSummary.expected_cash
                                    )}
                                </p>
                                <p className="text-sm text-blue-600">
                                    Opening:{" "}
                                    {formatRupiah(
                                        selectedSummary.opening_balance
                                    )}{" "}
                                    + Sales:{" "}
                                    {formatRupiah(selectedSummary.total_sales)}
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
                                        step="100"
                                        min={0}
                                        value={closeForm.actual_cash}
                                        onChange={(e) =>
                                            setCloseForm({
                                                ...closeForm,
                                                actual_cash: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
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
                                            Variance:{" "}
                                            {formatRupiah(
                                                parseFloat(
                                                    closeForm.actual_cash
                                                ) -
                                                    selectedSummary.expected_cash
                                            )}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-red-500 text-white py-4 mb-4 rounded-xl text-lg font-semibold hover:bg-red-600"
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
