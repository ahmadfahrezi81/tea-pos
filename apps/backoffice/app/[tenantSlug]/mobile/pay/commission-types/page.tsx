"use client";

import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Pencil } from "lucide-react";
import type { PayrollCommissionTypeResponse } from "@tea-pos/features/payroll-commission-types/schema";

function CommissionTypeRow({ type }: { type: PayrollCommissionTypeResponse }) {
    const { url } = useTenantSlug();

    return (
        <div className="flex items-center gap-3 py-4 border-b border-gray-100 last:border-none">
            <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900">{type.name}</p>
                <p className="text-sm font-mono text-gray-400">{type.slug}</p>
            </div>
            <span className={`font-mono font-bold text-base uppercase ${type.isEnabled ? "text-green-500" : "text-gray-400"}`}>
                {type.isEnabled ? "TRUE" : "FALSE"}
            </span>
            <button
                onClick={() => navigation.push(url(`/mobile/pay/commission-types/${type.id}/edit`))}
                className="p-2 text-brand active:opacity-70"
            >
                <Pencil size={22} strokeWidth={2} />
            </button>
        </div>
    );
}

export default function CommissionTypesPage() {
    const { commissionTypes, isLoading } = usePayrollCommissionTypes();

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none space-y-1.5">
                            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : commissionTypes.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No commission types yet.</p>
                ) : (
                    commissionTypes.map((type) => <CommissionTypeRow key={type.id} type={type} />)
                )}
            </div>
        </div>
    );
}
