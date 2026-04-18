"use client";

import { useProfile } from "@/lib/client/hooks/profile/useProfile";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

// ============================================================================
// FIELD ROW
// ============================================================================

const FieldRow = ({
    label,
    value,
    copyable = false,
}: {
    label: string;
    value: string;
    copyable?: boolean;
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="py-4 border-b border-gray-100 last:border-none">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <div className="flex items-center justify-between gap-3">
                <p className="text-base text-gray-900 font-medium">{value}</p>
                {copyable && (
                    <button
                        onClick={handleCopy}
                        className="shrink-0 text-gray-400 active:scale-95 transition-transform"
                    >
                        {copied ? (
                            <Check size={18} className="text-green-500" />
                        ) : (
                            <Copy size={18} />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// SKELETON
// ============================================================================

const SkeletonRow = () => (
    <div className="py-4 border-b border-gray-100 last:border-none space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
    </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function formatUserId(id: string): string {
    return id.slice(0, 13).toUpperCase();
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function splitFullName(fullName: string): {
    firstName: string;
    lastName: string;
} {
    const parts = fullName?.trim().split(" ") ?? [];
    const firstName = parts[0] ?? "—";
    const lastName = parts.slice(1).join(" ") || "—";
    return { firstName, lastName };
}

export default function MobilePersonalDetails() {
    const { profile, isLoading, isError } = useProfile();

    if (isError) {
        return (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-600">
                Failed to load profile details.
            </div>
        );
    }

    const { firstName, lastName } = profile
        ? splitFullName(profile.fullName)
        : { firstName: "—", lastName: "—" };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl px-4 shadow-sm">
                {isLoading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : (
                    <>
                        <FieldRow label="Email" value={profile?.email ?? "—"} />
                        <FieldRow
                            label="User ID"
                            value={formatUserId(profile?.id ?? "")}
                            copyable
                        />
                        <FieldRow label="First Name" value={firstName} />
                        <FieldRow label="Last Name" value={lastName} />
                        <FieldRow
                            label="Phone Number"
                            value={profile?.phoneNumber ?? "000"}
                        />
                        <FieldRow
                            label="Member Since"
                            value={formatDate(profile?.createdAt)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
