"use client";

import { useCurrentUser } from "@/lib/hooks/user/useCurrentUser";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/hooks/useT";

const FieldRow = ({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    return (
        <div className="py-4 border-b border-gray-100 last:border-none">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <div className="flex items-center justify-between gap-3">
                <p className="text-base text-gray-900 font-medium">{value}</p>
                {copyable && (
                    <button onClick={handleCopy} className="shrink-0 text-gray-400 active:scale-95 transition-transform">
                        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
};

const SkeletonRow = () => (
    <div className="py-4 border-b border-gray-100 last:border-none space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
    </div>
);

function formatUserId(id: string) { return id.slice(0, 13).toUpperCase(); }
function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function splitFullName(fullName: string) {
    const parts = fullName?.trim().split(" ") ?? [];
    return { firstName: parts[0] ?? "—", lastName: parts.slice(1).join(" ") || "—" };
}

export default function MobilePersonalDetails() {
    const { user, isLoading, isError } = useCurrentUser();
    const t = useT();

    if (isError) {
        return <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-600">{t("account.failedToLoad")}</div>;
    }

    const { firstName, lastName } = user ? splitFullName(user.fullName) : { firstName: "—", lastName: "—" };

    return (
        <div className="bg-white rounded-xl px-4">
            {isLoading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
            ) : (
                <>
                    <FieldRow label={t("account.email")} value={user?.email ?? "—"} />
                    <FieldRow label={t("account.userId")} value={formatUserId(user?.id ?? "")} copyable />
                    <FieldRow label={t("account.firstName")} value={firstName} />
                    <FieldRow label={t("account.lastName")} value={lastName} />
                    <FieldRow label={t("account.phoneNumber")} value={user?.phoneNumber ?? "—"} />
                    <FieldRow label={t("account.memberSince")} value={formatDate(user?.createdAt ?? null)} />
                </>
            )}
        </div>
    );
}
