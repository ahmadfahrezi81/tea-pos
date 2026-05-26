"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { FormFooter } from "@/components/shared/FormFooter";
import { CircleMinus } from "lucide-react";

const EXPENSE_TYPES = ["Ice", "Electricity", "Custom"];

interface ExpenseItem {
    label: string;
    customLabel: string;
    amount: string;
}

export default function AddExpensePage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const { data: summariesData, isLoading, createExpenses } = useSummaries(selectedStoreId, currentMonth);

    const todaySummary = useMemo(
        () => summariesData?.summaries.find((s) => s.date === todayStr && !s.closedAt),
        [summariesData?.summaries, todayStr],
    );

    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [newLabel, setNewLabel] = useState("Ice");
    const [newCustomLabel, setNewCustomLabel] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalNew = items.reduce((sum, i) => sum + (parseInt(i.amount || "0", 10)), 0);
    const isValid = items.length > 0 && items.every((i) => parseInt(i.amount, 10) > 0);

    const canAdd = newAmount && parseInt(newAmount, 10) > 0 && !(newLabel === "Custom" && !newCustomLabel.trim());

    const addItem = () => {
        if (!canAdd) return;
        setItems((prev) => [...prev, { label: newLabel, customLabel: newCustomLabel, amount: newAmount }]);
        setNewCustomLabel("");
        setNewAmount("");
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
            navigation.push(url("/mobile/home/manage/expense"));
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
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-4">
            {items.length > 0 && (
                <div className="bg-white rounded-xl p-4 space-y-3">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-lg text-base text-gray-700 truncate">
                                {item.label === "Custom" ? item.customLabel || "Custom" : item.label}
                            </div>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={100}
                                value={item.amount}
                                onChange={(e) => updateAmount(idx, e.target.value)}
                                placeholder="Amount"
                                className="w-32 p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none"
                            />
                            <button
                                onClick={() => removeItem(idx)}
                                className="p-2 text-red-400 active:bg-red-50 rounded-lg shrink-0"
                            >
                                <CircleMinus size={20} />
                            </button>
                        </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold bg-blue-50 rounded-lg p-3">
                        <span className="text-blue-800">Total</span>
                        <span className="text-blue-800">{formatRupiah(totalNew)}</span>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Expense</p>
                <div className="flex gap-2">
                    <select
                        value={newLabel}
                        onChange={(e) => { setNewLabel(e.target.value); setNewCustomLabel(""); }}
                        className="flex-1 p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
                    >
                        {EXPENSE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={100}
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-32 p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none"
                    />
                </div>
                {newLabel === "Custom" && (
                    <input
                        type="text"
                        placeholder="Label"
                        value={newCustomLabel}
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none"
                    />
                )}
                <button
                    onClick={addItem}
                    disabled={!canAdd}
                    className="w-full p-3 border border-dashed border-brand/40 rounded-lg text-brand text-base font-medium active:bg-brand/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    + Add to list
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <FormFooter
                label="Save Expenses"
                loadingLabel="Saving..."
                onSubmit={handleSubmit}
                disabled={!isValid}
                isLoading={isSubmitting}
                variant="green"
            />
        </div>
    );
}
