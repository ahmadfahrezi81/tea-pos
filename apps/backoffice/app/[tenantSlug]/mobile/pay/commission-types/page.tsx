"use client";

import { usePayrollCommissionConfigs } from "@/lib/hooks/payroll-commission-configs/usePayrollCommissionConfigs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Pencil } from "lucide-react";
import { ListRow, ListCard, ListRowSkeleton } from "@tea-pos/ui/custom/ListRow";
import type { PayrollCommissionConfigResponse } from "@tea-pos/features/payroll-commission-configs/schema";

function CommissionTypeRow({ type }: { type: PayrollCommissionConfigResponse }) {
    const { url } = useTenantSlug();

    return (
        <ListRow
            title={type.name}
            subtitle={<span className="font-mono">{type.slug}</span>}
            trailing={
                <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono font-bold text-base uppercase ${type.isEnabled ? "text-green-500" : "text-gray-400"}`}>
                        {type.isEnabled ? "TRUE" : "FALSE"}
                    </span>
                    <button
                        onClick={() => navigation.push(url(`/mobile/pay/commission-types/${type.id}/edit`))}
                        className="p-2 -mr-2 text-brand active:opacity-70"
                    >
                        <Pencil size={22} strokeWidth={2} />
                    </button>
                </div>
            }
        />
    );
}

export default function CommissionTypesPage() {
    const { commissionTypes, isLoading } = usePayrollCommissionConfigs();

    return (
        <div className="space-y-3">
            <ListCard>
                {isLoading ? (
                    [1, 2].map((i) => <ListRowSkeleton key={i} />)
                ) : commissionTypes.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No commission types yet.</p>
                ) : (
                    commissionTypes.map((type) => <CommissionTypeRow key={type.id} type={type} />)
                )}
            </ListCard>
        </div>
    );
}
