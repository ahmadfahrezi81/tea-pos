"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { Receipt } from "lucide-react";

export default function ExpensePage() {
    const { selectedStoreId } = useStore();
    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const { data: summariesData, isLoading } = useSummaries(selectedStoreId, currentMonth);

    const todaySummary = useMemo(
        () => summariesData?.summaries.find((s) => s.date === todayStr && !s.closedAt),
        [summariesData?.summaries, todayStr],
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const existingExpenses = (todaySummary as typeof todaySummary & {
        expenses?: { id: string; expenseType: string; amount: number }[];
    })?.expenses ?? [];

    if (existingExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Receipt size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No expenses recorded today.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4">
                <div className="space-y-2">
                    {existingExpenses.map((e) => (
                        <div key={e.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{e.expenseType}</span>
                            <span className="font-medium text-gray-800">{formatRupiah(e.amount)}</span>
                        </div>
                    ))}
                    <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm">
                        <span className="text-gray-700">Total</span>
                        <span className="text-gray-900">{formatRupiah(todaySummary?.totalExpenses ?? 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
