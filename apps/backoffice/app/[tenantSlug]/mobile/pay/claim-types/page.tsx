"use client";

import { usePayrollClaimConfigs } from "@/lib/hooks/payroll-claim-configs/usePayrollClaimConfigs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Pencil } from "lucide-react";
import { ListRow, ListCard, ListRowSkeleton } from "@tea-pos/ui/custom/ListRow";
import type { PayrollClaimConfigResponse } from "@tea-pos/features/payroll-claim-configs/schema";

const FREQUENCY_LABEL: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    one_time: "One-time",
};

function ClaimTypeRow({ type }: { type: PayrollClaimConfigResponse }) {
    const { url } = useTenantSlug();

    return (
        <ListRow
            title={type.name}
            subtitle={
                <>
                    {FREQUENCY_LABEL[type.frequency]}
                    {type.claimSource === "auto" && " · Auto"}
                    {type.claimSource === "auto_submit" && " · Auto submit"}
                </>
            }
            trailing={
                <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono font-bold text-base uppercase ${type.isEnabled ? "text-green-500" : "text-gray-400"}`}>
                        {type.isEnabled ? "TRUE" : "FALSE"}
                    </span>
                    <button
                        onClick={() => navigation.push(url(`/mobile/pay/claim-types/${type.id}/edit`))}
                        className="p-2 -mr-2 text-brand active:opacity-70"
                    >
                        <Pencil size={22} strokeWidth={2} />
                    </button>
                </div>
            }
        />
    );
}

export default function ClaimTypesPage() {
    const { claimTypes, isLoading } = usePayrollClaimConfigs();

    return (
        <div className="space-y-3">
            <ListCard>
                {isLoading ? (
                    [1, 2].map((i) => <ListRowSkeleton key={i} />)
                ) : claimTypes.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No claim types yet.</p>
                ) : (
                    claimTypes.map((type) => <ClaimTypeRow key={type.id} type={type} />)
                )}
            </ListCard>
        </div>
    );
}
