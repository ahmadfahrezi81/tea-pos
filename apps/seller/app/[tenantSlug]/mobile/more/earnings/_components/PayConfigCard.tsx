"use client";

import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useT } from "@/lib/hooks/useT";

export function PayConfigCard() {
    const { info, isLoading } = usePayrollUserInfo();
    const t = useT();

    if (isLoading) {
        return <div className="bg-white rounded-2xl p-4 h-20 animate-pulse" />;
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
                    {info.commissionTypeName && (
                        <p className="text-sm text-gray-500">{info.commissionTypeName}</p>
                    )}
                </>
            )}
        </div>
    );
}
