"use client";

import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useT } from "@/lib/hooks/useT";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { getPayWindowBounds, getExpectedPayoutDate } from "@tea-pos/utils/week";
import { format, parseISO } from "date-fns";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import CopyableField from "@/components/shared/CopyableField";

export function PayConfigCard() {
    const { info, isLoading } = usePayrollUserInfo();
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

    const frequency = info?.payFrequency ?? "bi_weekly";
    const today = getTodayLocalStr();
    const { endDate } = getPayWindowBounds(today, frequency);
    const expectedPayout = getExpectedPayoutDate(endDate);

    const rows = [
        { label: "Per Cup", value: info?.ratePerCup ? formatRupiah(info.ratePerCup) : "—" },
        { label: "Expected Payout", value: format(parseISO(expectedPayout), "EEE, d MMM yyyy") },
    ];

    const slug = info?.commissionConfigSlug ?? null;

    return (
        <div className="bg-white p-4 rounded-2xl space-y-2 text-sm">
            {rows.map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                </div>
            ))}
            <div className="flex justify-between items-center">
                <span className="text-gray-500">Commission Config</span>
                <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-800">{slug ?? "—"}</span>
                    {slug && <CopyableField label="Commission Config" value={slug} />}
                </div>
            </div>
        </div>
    );
}
