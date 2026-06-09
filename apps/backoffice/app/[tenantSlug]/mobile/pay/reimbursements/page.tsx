"use client";

import { useState } from "react";
import { usePayrollClaims } from "@/lib/hooks/payroll-claims/usePayrollClaims";
import type { PayrollClaimResponse } from "@tea-pos/features/payroll-claims/schema";
import { format } from "date-fns";
import { Check, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-600",
    paid: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid",
};

const TAB_STATUSES = ["pending", "approved", "paid", "rejected"] as const;
type Tab = (typeof TAB_STATUSES)[number];

function ClaimCard({
    claim,
    onApprove,
    onReject,
    isActing,
}: {
    claim: PayrollClaimResponse;
    onApprove?: () => void;
    onReject?: () => void;
    isActing: boolean;
}) {
    const [showPhoto, setShowPhoto] = useState(false);
    return (
        <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-base font-semibold text-gray-900">
                        {claim.claimTypeName ?? claim.claimTypeId ?? "—"}
                    </p>
                    <p className="text-sm text-gray-500">
                        {format(new Date(claim.date), "d MMM yyyy")}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-base font-bold text-gray-900">
                        Rp {claim.amount.toLocaleString("id-ID")}
                    </p>
                    <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[claim.status] ?? ""}`}
                    >
                        {STATUS_LABEL[claim.status] ?? claim.status}
                    </span>
                </div>
            </div>
            {claim.notes && (
                <p className="text-sm text-gray-500 italic">{claim.notes}</p>
            )}
            {claim.photoUrl && (
                <>
                    <button
                        onClick={() => setShowPhoto(true)}
                        className="flex items-center gap-1.5 text-sm text-brand active:opacity-70"
                    >
                        <ImageIcon size={14} />
                        View receipt
                    </button>
                    {showPhoto && (
                        <div
                            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                            onClick={() => setShowPhoto(false)}
                        >
                            <Image
                                src={claim.photoUrl}
                                alt="receipt"
                                width={400}
                                height={400}
                                className="rounded-xl max-h-[80vh] w-auto object-contain"
                            />
                        </div>
                    )}
                </>
            )}
            {claim.status === "pending" && onApprove && onReject && (
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={onReject}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl active:opacity-80 disabled:opacity-40 text-sm"
                    >
                        <X size={16} />
                        Reject
                    </button>
                    <button
                        onClick={onApprove}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-40 text-sm"
                    >
                        <Check size={16} />
                        Approve
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdminClaimsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("pending");
    const { claims, mutate, isLoading, updateStatus } = usePayrollClaims();
    const [actingId, setActingId] = useState<string | null>(null);

    const filtered = claims.filter((c) => c.status === activeTab);

    const handleAction = async (id: string, status: "approved" | "rejected") => {
        setActingId(id);
        try {
            await updateStatus(id, { status });
            await mutate();
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {TAB_STATUSES.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                    >
                        {STATUS_LABEL[tab]}
                    </button>
                ))}
            </div>
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No {activeTab} claims.</p>
            ) : (
                <div className="space-y-2">
                    {filtered.map((claim) => (
                        <ClaimCard
                            key={claim.id}
                            claim={claim}
                            onApprove={
                                claim.status === "pending"
                                    ? () => handleAction(claim.id, "approved")
                                    : undefined
                            }
                            onReject={
                                claim.status === "pending"
                                    ? () => handleAction(claim.id, "rejected")
                                    : undefined
                            }
                            isActing={actingId === claim.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
