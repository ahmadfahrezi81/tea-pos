"use client";

import { usePayrollUserInfo } from "@/lib/hooks/payroll/usePayrollUserInfo";
import { usePayFrequency } from "@/lib/context/PayFrequencyContext";
import { useT } from "@/lib/hooks/useT";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { getPayWindowBounds, getExpectedPayoutDate } from "@tea-pos/utils/week";
import { format, parseISO } from "date-fns";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import CopyableField from "@/components/shared/CopyableField";
import { CalendarClock } from "lucide-react";

export function PayConfigCard() {
    const { info, isLoading } = usePayrollUserInfo();
    const frequency = usePayFrequency();
    const t = useT();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                    <SkeletonValue key={i} loading className="h-5 w-full">{null}</SkeletonValue>
                ))}
            </div>
        );
    }

    const today = getTodayLocalStr();
    // Without a cadence there is no pay window and no next payout date to quote.
    const expectedPayout = frequency
        ? getExpectedPayoutDate(getPayWindowBounds(today, frequency).endDate)
        : null;

    const FREQUENCY_LABELS: Record<string, string> = {
        weekly: t("earnings.freqWeekly"),
        bi_weekly: t("earnings.freqBiWeekly"),
        four_weekly: t("earnings.freqFourWeekly"),
    };

    const rows = [
        { label: t("earnings.payFrequency"), value: frequency ? (FREQUENCY_LABELS[frequency] ?? frequency) : "—" },
        { label: t("earnings.perCupLabel"), value: info?.ratePerCup != null ? formatRupiah(info.ratePerCup) : "—" },
    ];

    const slug = info?.commissionConfigSlug ?? null;

    return (
        <div className="space-y-3">
            {/* Next expected payout — its own section so pay date is unmistakable */}
            {expectedPayout && (
                <div className="bg-white p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                        <CalendarClock size={24} className="text-brand" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500">{t("earnings.nextExpectedPayout")}</p>
                        <p className="text-lg font-bold text-gray-900">
                            {format(parseISO(expectedPayout), "EEE, d MMM yyyy")}
                        </p>
                    </div>
                </div>
            )}

            {/* Pay config details */}
            <div className="bg-white p-4 rounded-2xl space-y-2 text-sm">
                <h3 className="font-semibold text-gray-800">{t("earnings.payConfig")}</h3>
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800">{value}</span>
                    </div>
                ))}
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("earnings.commissionConfig")}</span>
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-800">{slug ?? "—"}</span>
                        {slug && <CopyableField label={t("earnings.commissionConfig")} value={slug} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
