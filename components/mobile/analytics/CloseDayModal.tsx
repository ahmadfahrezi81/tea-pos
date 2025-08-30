import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { DailySummary as BaseDailySummary } from "@/lib/types";

interface Expense {
    id: string;
    expense_type: string;
    amount: number;
}

type DailySummaryWithExpenses = BaseDailySummary & {
    expenses: Expense[];
    total_expenses: number;
};

interface CloseDayModalProps {
    isOpen: boolean;
    summary: DailySummaryWithExpenses;
    onClose: () => void;
    onSubmit: (
        actualCash: number,
        notes: string,
        variance: number
    ) => Promise<void>;
    formatDate: (date: string) => string;
    getStoreName: () => string;
}

export const CloseDayModal = ({
    isOpen,
    summary,
    onClose,
    onSubmit,
    formatDate,
    getStoreName,
}: CloseDayModalProps) => {
    const [closeForm, setCloseForm] = useState({
        actual_cash: summary?.expected_cash?.toString() || "",
        notes: "",
    });

    console.log("Summary in CloseDayModal", summary);

    useEffect(() => {
        if (summary?.expected_cash != null) {
            setCloseForm({
                actual_cash: summary.expected_cash.toString(),
                notes: "", // Reset notes or keep previous if needed
            });
        }
    }, [summary?.expected_cash, summary?.total_sales]);

    if (!isOpen || !summary) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const actualCash = parseFloat(closeForm.actual_cash);
        const variance = actualCash - summary.expected_cash;

        await onSubmit(actualCash, closeForm.notes, variance);
        onClose();
        setCloseForm({
            actual_cash: "",
            notes: "",
        });
    };

    const handleClose = () => {
        onClose();
        setCloseForm({
            actual_cash: "",
            notes: "",
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            onClick={handleClose}
        >
            <div
                className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex flex-col space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Close Day
                        </h2>
                        <p className="text-sm text-gray-600">
                            {formatDate(summary.date)} · {getStoreName()}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
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
                            {formatRupiah(summary.expected_cash)}
                        </p>
                        <p className="text-sm text-blue-600">
                            Opening: {formatRupiah(summary.opening_balance)} +
                            Sales: {formatRupiah(summary.total_sales)} -
                            Expense: {formatRupiah(summary.total_expenses)}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Actual Cash Count
                            </label>
                            <input
                                type="number"
                                step="100"
                                inputMode="numeric"
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
                                        summary.expected_cash >=
                                    0
                                        ? "bg-green-50"
                                        : "bg-red-50"
                                }`}
                            >
                                <p className="font-medium">
                                    Variance:{" "}
                                    {formatRupiah(
                                        parseFloat(closeForm.actual_cash) -
                                            summary.expected_cash
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
    );
};
