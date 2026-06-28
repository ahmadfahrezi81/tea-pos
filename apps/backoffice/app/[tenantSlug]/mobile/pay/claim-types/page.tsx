"use client";

import { usePayrollClaimTypes } from "@/lib/hooks/payroll-claim-types/usePayrollClaimTypes";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Pencil } from "lucide-react";
import type { PayrollClaimTypeResponse } from "@tea-pos/features/payroll-claim-types/schema";

const FREQUENCY_LABEL: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    one_time: "One-time",
};

function ClaimTypeRow({ type }: { type: PayrollClaimTypeResponse }) {
    const { url } = useTenantSlug();

    return (
        <div className="flex items-center gap-3 py-4 border-b border-gray-100 last:border-none">
            <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900">{type.name}</p>
                <p className="text-sm text-gray-400">
                    {FREQUENCY_LABEL[type.frequency]}
                    {type.claimSource === "auto" && " · Auto"}
                </p>
            </div>
            <span className={`font-mono font-bold text-base uppercase ${type.isEnabled ? "text-green-500" : "text-gray-400"}`}>
                {type.isEnabled ? "TRUE" : "FALSE"}
            </span>
            <button
                onClick={() => navigation.push(url(`/mobile/pay/claim-types/${type.id}/edit`))}
                className="p-2 text-brand active:opacity-70"
            >
                <Pencil size={22} strokeWidth={2} />
            </button>
        </div>
    );
}

export default function ClaimTypesPage() {
    const { claimTypes, isLoading } = usePayrollClaimTypes();

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none space-y-1.5">
                            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : claimTypes.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No claim types yet.</p>
                ) : (
                    claimTypes.map((type) => <ClaimTypeRow key={type.id} type={type} />)
                )}
            </div>
        </div>
    );
}
