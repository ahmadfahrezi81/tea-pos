"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { CircleMinus, Loader2 } from "lucide-react";

const EXPENSE_TYPES = ["Ice", "Electricity", "Custom"];

interface ExpenseItem {
    label: string;
    customLabel: string;
    amount: string;
}

export default function ExpensePage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const { data: summariesData, isLoading, createExpenses } = useSummaries(
        selectedStoreId,
        currentMonth,
    );

    const todaySummary = useMemo(
        () => summariesData?.summaries.find((s) => s.date === todayStr && !s.closedAt),
        [summariesData?.summaries, todayStr],
    );

    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [newLabel, setNewLabel] = useState("Ice");
    const [newCustomLabel, setNewCustomLabel] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalNew = items.reduce((sum, i) => sum + (parseInt(i.amount || "0", 10)), 0);
    const isValid = items.length > 0 && items.every((i) => parseInt(i.amount, 10) > 0);

    const addItem = () => {
        if (newLabel === "Custom" && !newCustomLabel.trim()) return;
        setItems((prev) => [...prev, { label: newLabel, customLabel: newCustomLabel, amount: "" }]);
        setNewLabel("Ice");
        setNewCustomLabel("");
        setShowPicker(false);
    };

    const removeItem = (idx: number) =>
        setItems((prev) => prev.filter((_, i) => i !== idx));

    const updateAmount = (idx: number, amount: string) =>
        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, amount } : item)));

    const handleSubmit = async () => {
        if (!todaySummary || !selectedStoreId || !isValid) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await createExpenses({
                dailySummaryId: todaySummary.id,
                storeId: selectedStoreId,
                expenses: items,
            });
            navigation.push(url("/mobile/home/manage"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save expenses");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!todaySummary) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <p className="text-gray-500 text-sm">No open summary for today.</p>
                <button
                    onClick={() => navigation.push(url("/mobile/home/manage"))}
                    className="mt-4 text-brand text-sm font-medium"
                >
                    Go back
                </button>
            </div>
        );
    }

    const existingExpenses = (todaySummary as typeof todaySummary & { expenses?: { id: string; expenseType: string; amount: number }[] }).expenses ?? [];

    return (
        <div className="space-y-4 pb-32">
            {existingExpenses.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Today&apos;s Expenses
                    </h3>
                    <div className="space-y-2">
                        {existingExpenses.map((e) => (
                            <div key={e.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">{e.expenseType}</span>
                                <span className="font-medium text-gray-800">
                                    {formatRupiah(e.amount)}
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-sm">
                            <span className="text-gray-700">Total</span>
                            <span className="text-gray-900">
                                {formatRupiah(todaySummary.totalExpenses)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Add Expenses</h3>

                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 truncate">
                            {item.label === "Custom"
                                ? item.customLabel || "Custom"
                                : item.label}
                        </div>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={100}
                            value={item.amount}
                            onChange={(e) => updateAmount(idx, e.target.value)}
                            placeholder="Amount"
                            className="w-32 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand/90 focus:outline-none"
                        />
                        <button
                            onClick={() => removeItem(idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                        >
                            <CircleMinus size={20} />
                        </button>
                    </div>
                ))}

                <button
                    onClick={() => setShowPicker(true)}
                    className="w-full p-3 border border-dashed border-gray-300 rounded-lg text-brand text-sm font-medium hover:bg-gray-50"
                >
                    + Add Expense
                </button>

                {items.length > 0 && (
                    <div className="flex justify-between text-sm font-semibold bg-blue-50 rounded-lg p-3">
                        <span className="text-blue-900">New Total</span>
                        <span className="text-blue-900">{formatRupiah(totalNew)}</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8">
                <button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save Expenses"
                    )}
                </button>
            </div>

            {showPicker && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
                    onClick={() => setShowPicker(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-lg w-72 p-4 mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-semibold mb-3">Expense Type</h3>
                        <select
                            value={newLabel}
                            onChange={(e) => {
                                setNewLabel(e.target.value);
                                setNewCustomLabel("");
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-brand/90 focus:outline-none"
                        >
                            {EXPENSE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                        {newLabel === "Custom" && (
                            <input
                                type="text"
                                placeholder="Enter label"
                                value={newCustomLabel}
                                onChange={(e) => setNewCustomLabel(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-brand/90 focus:outline-none"
                            />
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowPicker(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addItem}
                                disabled={newLabel === "Custom" && !newCustomLabel.trim()}
                                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
