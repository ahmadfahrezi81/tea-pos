"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { SelectInput } from "../../_components/shared/SelectInput";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { FormFooter } from "@/components/shared/FormFooter";
import { getTodayLocalStr, getCurrentLocalMonth } from "@tea-pos/utils/time";
import { useT } from "@/lib/hooks/useT";
import type { DailySummaryResponse } from "@tea-pos/features/summaries/schema";

const EXPENSE_OPTIONS = [
    { value: "Ice", label: "Ice" },
    { value: "Electricity", label: "Electricity" },
    { value: "Custom", label: "Custom" },
];

export default function AddExpensePage() {
    const router = useRouter();
    const { selectedStoreId } = useStore();
    const t = useT();

    const todayStr = useMemo(() => getTodayLocalStr(), []);
    const currentMonth = useMemo(() => getCurrentLocalMonth(), []);

    const { data: summariesData, isLoading, createExpenses } = useSummaries(selectedStoreId, currentMonth);

    const todaySummary = useMemo(
        () => summariesData?.summaries.find((s: DailySummaryResponse) => s.date === todayStr && !s.closedAt),
        [summariesData?.summaries, todayStr],
    );

    const [label, setLabel] = useState("Ice");
    const [customLabel, setCustomLabel] = useState("");
    const [amount, setAmount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValid = amount > 0 && !(label === "Custom" && !customLabel.trim());

    const handleSubmit = async () => {
        if (!todaySummary || !selectedStoreId || !isValid) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await createExpenses({
                dailySummaryId: todaySummary.id,
                storeId: selectedStoreId,
                expenses: [{ label, customLabel, amount: String(amount) }],
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save expense");
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
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("manage.type")}</p>
                    <SelectInput
                        options={EXPENSE_OPTIONS}
                        value={label}
                        onChange={(v) => { setLabel(v); setCustomLabel(""); }}
                        otherTriggerValue="Custom"
                        otherValue={customLabel}
                        onOtherChange={setCustomLabel}
                        otherPlaceholder="e.g. Maintenance, Transport..."
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("manage.amount")}</p>
                    <NumberInput value={amount} onChange={setAmount} currency />
                </div>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
            </div>

            <FormFooter
                label={t("manage.submitExpense")}
                loadingLabel={t("common.loading")}
                onSubmit={handleSubmit}
                disabled={!isValid}
                isLoading={isSubmitting}
            />
        </div>
    );
}
