"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { FormFooter } from "@/components/shared/FormFooter";
import { Receipt } from "lucide-react";
import { getTodayLocalStr, getCurrentLocalMonth } from "@tea-pos/utils/time";

export default function ExpensePage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();
    const todayStr = useMemo(() => getTodayLocalStr(), []);
    const currentMonth = useMemo(() => getCurrentLocalMonth(), []);

    const { data: summariesData, isLoading } = useSummaries(selectedStoreId, currentMonth);

    const todaySummary = useMemo(
        () => summariesData?.summaries.find((s) => s.date === todayStr && !s.closedAt),
        [summariesData?.summaries, todayStr],
    );

    const existingExpenses = useMemo(
        () =>
            (todaySummary as typeof todaySummary & {
                expenses?: { id: string; type: string; amount: number }[];
            })?.expenses ?? [],
        [todaySummary],
    );

    const inner = isLoading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
    ) : existingExpenses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Receipt size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No expenses recorded today.</p>
        </div>
    ) : (
        <div className="divide-y divide-gray-100">
            {existingExpenses.map((e) => (
                <div key={e.id} className="flex justify-between px-4 py-3">
                    <span className="text-base text-gray-700">{e.type}</span>
                    <span className="text-base font-medium text-gray-900">{formatRupiah(e.amount)}</span>
                </div>
            ))}
            <div className="flex justify-between px-4 py-3">
                <span className="text-base font-semibold text-gray-700">Total</span>
                <span className="text-base font-semibold text-gray-900">
                    {formatRupiah(todaySummary?.totalExpenses ?? 0)}
                </span>
            </div>
        </div>
    );

    return (
        <>
            <div className="flex-1 bg-white rounded-2xl flex flex-col">
                {inner}
            </div>
            <FormFooter
                label="New Store Expense"
                onSubmit={() => navigation.push(url("/mobile/home/manage/expense/add"))}
            />
        </>
    );
}
