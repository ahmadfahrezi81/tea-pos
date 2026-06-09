"use client";

import { usePayrollClaims } from "@/lib/hooks/payroll-claims/usePayrollClaims";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { FormFooter } from "@/components/shared/FormFooter";
import { ReceiptText } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-600",
    paid: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid ✓",
};

export default function ReimbursementsPage() {
    const { url } = useTenantSlug();
    const { claims, isLoading } = usePayrollClaims();

    const inner = isLoading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
    ) : claims.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ReceiptText size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No claims yet.</p>
        </div>
    ) : (
        <ul className="divide-y divide-gray-100">
            {claims.map((claim) => (
                <li key={claim.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                        <p className="text-base font-medium text-gray-800">
                            {claim.claimTypeName ?? claim.claimTypeId ?? "—"}
                        </p>
                        <p className="text-sm text-gray-400">
                            {format(new Date(claim.date), "d MMM yyyy")}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-base font-semibold text-gray-900">
                            Rp {claim.amount.toLocaleString("id-ID")}
                        </p>
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[claim.status] ?? STATUS_STYLE.pending}`}
                        >
                            {STATUS_LABEL[claim.status] ?? claim.status}
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );

    return (
        <>
            <div className="flex-1 bg-white rounded-2xl flex flex-col">
                {inner}
            </div>
            <FormFooter
                label="New Claim"
                onSubmit={() => navigation.push(url("/mobile/more/reimbursements/add"))}
            />
        </>
    );
}
