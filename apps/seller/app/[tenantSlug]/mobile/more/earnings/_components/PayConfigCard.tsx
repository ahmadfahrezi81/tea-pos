"use client";

import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useT } from "@/lib/hooks/useT";
import { SkeletonValue } from "@/components/shared/SkeletonValue";

export function PayConfigCard() {
    const { info, isLoading } = usePayrollUserInfo();
    const t = useT();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-4 space-y-2">
                <SkeletonValue loading className="h-3 w-20">{null}</SkeletonValue>
                <SkeletonValue loading className="h-6 w-32">{null}</SkeletonValue>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t("earnings.payConfig")}
            </p>
            {!info?.ratePerCup ? (
                <p className="text-sm text-amber-600">{t("earnings.noRateConfigured")}</p>
            ) : (
                <>
                    <p className="text-lg font-bold text-gray-900">
                        Rp {info.ratePerCup.toLocaleString("id-ID")}{" "}
                        <span className="text-sm font-medium text-gray-400">{t("earnings.perCup")}</span>
                    </p>
                    {info.commissionConfigName && (
                        <p className="text-sm text-gray-500">{info.commissionConfigName}</p>
                    )}
                </>
            )}
        </div>
    );
}
