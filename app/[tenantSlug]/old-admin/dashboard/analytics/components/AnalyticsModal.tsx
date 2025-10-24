// dashboard/analytics/components/AnalyticsModal.tsx
import React, { useState, useEffect } from "react";
import { DailySummary } from "../types/analytics";
import { X, DollarSign, Receipt, XCircle, Calendar } from "lucide-react";

type ModalType = "balance" | "expense" | "close" | null;

interface AnalyticsModalProps {
    isOpen: boolean;
    modalType: ModalType;
    summary: DailySummary | null;
    onClose: () => void;
    onBalanceSubmit: (balance: number) => void;
    onExpenseSubmit: (
        expenses: Array<{ label: string; customLabel?: string; amount: string }>
    ) => void;
    onCloseSubmit: (
        actualCash: number,
        notes: string | null,
        variance: number
    ) => void;
    isSubmitting?: boolean;
}

const EXPENSE_PRESETS = [
    "Lunch",
    "Transportation",
    "Supplies",
    "Maintenance",
    "Utilities",
    "Other",
];

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
    isOpen,
    modalType,
    summary,
    onClose,
    onBalanceSubmit,
    onExpenseSubmit,
    onCloseSubmit,
    isSubmitting = false,
}) => {
    // Balance form state
    const [openingBalance, setOpeningBalance] = useState("");

    // Expense form state
    const [expenses, setExpenses] = useState<
        Array<{
            label: string;
            customLabel?: string;
            amount: string;
        }>
    >([{ label: "Lunch", amount: "" }]);

    // Close form state
    const [actualCash, setActualCash] = useState("");
    const [notes, setNotes] = useState("");

    // Reset form states when modal opens/closes
    useEffect(() => {
        if (isOpen && summary) {
            if (modalType === "balance") {
                setOpeningBalance(summary.opening_balance.toString());
            } else if (modalType === "expense") {
                setExpenses([{ label: "Lunch", amount: "" }]);
            } else if (modalType === "close") {
                setActualCash(summary.expected_cash.toString());
                setNotes("");
            }
        } else {
            // Reset all states when closing
            setOpeningBalance("");
            setExpenses([{ label: "Lunch", amount: "" }]);
            setActualCash("");
            setNotes("");
        }
    }, [isOpen, summary, modalType]);

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

    // Handle form submissions
    const handleBalanceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const balance = parseFloat(openingBalance);
        if (!isNaN(balance)) {
            onBalanceSubmit(balance);
        }
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validExpenses = expenses.filter(
            (exp) => exp.amount.trim() !== "" && !isNaN(parseFloat(exp.amount))
        );
        if (validExpenses.length > 0) {
            onExpenseSubmit(validExpenses);
        }
    };

    const handleCloseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cash = parseFloat(actualCash);
        if (!isNaN(cash) && summary) {
            const variance = cash - summary.expected_cash;
            onCloseSubmit(cash, notes.trim() || null, variance);
        }
    };

    // Expense management functions
    const addExpense = () => {
        setExpenses([...expenses, { label: "Other", amount: "" }]);
    };

    const removeExpense = (index: number) => {
        if (expenses.length > 1) {
            setExpenses(expenses.filter((_, i) => i !== index));
        }
    };

    const updateExpense = (index: number, field: string, value: string) => {
        const newExpenses = [...expenses];
        if (field === "label") {
            newExpenses[index].label = value;
            if (value !== "Other") {
                delete newExpenses[index].customLabel;
            }
        } else if (field === "customLabel") {
            newExpenses[index].customLabel = value;
        } else if (field === "amount") {
            newExpenses[index].amount = value;
        }
        setExpenses(newExpenses);
    };

    if (!isOpen || !summary || !modalType) return null;

    const getModalConfig = () => {
        switch (modalType) {
            case "balance":
                return {
                    title: "Edit Opening Balance",
                    icon: DollarSign,
                    submitText: "Update Balance",
                    submitColor: "bg-purple-600 hover:bg-purple-700",
                };
            case "expense":
                return {
                    title: "Add Daily Expenses",
                    icon: Receipt,
                    submitText: "Add Expenses",
                    submitColor: "bg-orange-600 hover:bg-orange-700",
                };
            case "close":
                return {
                    title: "Close Day",
                    icon: XCircle,
                    submitText: "Close Day",
                    submitColor: "bg-red-600 hover:bg-red-700",
                };
            default:
                return {
                    title: "",
                    icon: DollarSign,
                    submitText: "Submit",
                    submitColor: "bg-blue-600 hover:bg-blue-700",
                };
        }
    };

    const config = getModalConfig();
    const IconComponent = config.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {config.title}
                            </h2>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(summary.date)} -{" "}
                                {summary.stores?.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Balance Form */}
                {modalType === "balance" && (
                    <form onSubmit={handleBalanceSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Opening Balance
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                    Rp
                                </span>
                                <input
                                    type="number"
                                    step="100"
                                    min="0"
                                    value={openingBalance}
                                    onChange={(e) =>
                                        setOpeningBalance(e.target.value)
                                    }
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled={isSubmitting}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !openingBalance}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white ${
                                    isSubmitting || !openingBalance
                                        ? "bg-gray-300 cursor-not-allowed"
                                        : config.submitColor
                                }`}
                            >
                                {isSubmitting
                                    ? "Updating..."
                                    : config.submitText}
                            </button>
                        </div>
                    </form>
                )}

                {/* Expense Form */}
                {modalType === "expense" && (
                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                        {expenses.map((expense, index) => (
                            <div
                                key={index}
                                className="border border-gray-200 rounded-lg p-4"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-medium text-gray-700">
                                        Expense {index + 1}
                                    </h4>
                                    {expenses.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeExpense(index)}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                            disabled={isSubmitting}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Type
                                        </label>
                                        <select
                                            value={expense.label}
                                            onChange={(e) =>
                                                updateExpense(
                                                    index,
                                                    "label",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                            disabled={isSubmitting}
                                        >
                                            {EXPENSE_PRESETS.map((preset) => (
                                                <option
                                                    key={preset}
                                                    value={preset}
                                                >
                                                    {preset}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {expense.label === "Other" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Custom Label
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    expense.customLabel || ""
                                                }
                                                onChange={(e) =>
                                                    updateExpense(
                                                        index,
                                                        "customLabel",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Enter custom expense type"
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Amount
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                                Rp
                                            </span>
                                            <input
                                                type="number"
                                                step="100"
                                                min="0"
                                                value={expense.amount}
                                                onChange={(e) =>
                                                    updateExpense(
                                                        index,
                                                        "amount",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                                required
                                                disabled={isSubmitting}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addExpense}
                            className="w-full py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Add Another Expense
                        </button>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !expenses.some(
                                        (exp) => exp.amount.trim() !== ""
                                    )
                                }
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white ${
                                    isSubmitting ||
                                    !expenses.some(
                                        (exp) => exp.amount.trim() !== ""
                                    )
                                        ? "bg-gray-300 cursor-not-allowed"
                                        : config.submitColor
                                }`}
                            >
                                {isSubmitting ? "Adding..." : config.submitText}
                            </button>
                        </div>
                    </form>
                )}

                {/* Close Day Form */}
                {modalType === "close" && (
                    <>
                        {/* Expected Cash Summary */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="font-semibold text-blue-900 mb-2">
                                Expected Cash Summary
                            </h3>
                            <div className="space-y-1 text-sm text-blue-800">
                                <p>
                                    Opening Balance:{" "}
                                    {formatRupiah(summary.opening_balance)}
                                </p>
                                <p>
                                    Total Sales:{" "}
                                    {formatRupiah(summary.total_sales)}
                                </p>
                                <p>
                                    Less Expenses: -
                                    {formatRupiah(summary.total_expenses || 0)}
                                </p>
                                <hr className="border-blue-300" />
                                <p className="font-semibold">
                                    Expected Cash:{" "}
                                    {formatRupiah(summary.expected_cash)}
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={handleCloseSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Actual Cash Count
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                        Rp
                                    </span>
                                    <input
                                        type="number"
                                        step="100"
                                        min="0"
                                        value={actualCash}
                                        onChange={(e) =>
                                            setActualCash(e.target.value)
                                        }
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        disabled={isSubmitting}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Any notes about the day..."
                                    disabled={isSubmitting}
                                />
                            </div>

                            {actualCash && !isNaN(parseFloat(actualCash)) && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm font-medium text-yellow-800">
                                        Variance:{" "}
                                        {formatRupiah(
                                            parseFloat(actualCash) -
                                                summary.expected_cash
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !actualCash}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white ${
                                        isSubmitting || !actualCash
                                            ? "bg-gray-300 cursor-not-allowed"
                                            : config.submitColor
                                    }`}
                                >
                                    {isSubmitting
                                        ? "Closing..."
                                        : config.submitText}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
