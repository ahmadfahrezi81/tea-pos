"use client";

import { useStore } from "@/lib/context/StoreContext";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { INCIDENT_CATEGORY_LABELS } from "@tea-pos/features/reports/schema";
import { FormFooter } from "@/components/shared/FormFooter";
import { ClipboardList } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
    open: "Open",
    acknowledged: "Acknowledged",
    resolved: "Resolved",
};

const STATUS_STYLE: Record<string, string> = {
    open: "bg-red-50 text-red-700",
    acknowledged: "bg-yellow-50 text-yellow-700",
    resolved: "bg-green-50 text-green-700",
};

export default function ReportPage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();
    const { reports, isLoading } = useIncidentReports(selectedStoreId);

    const footer = (
        <FormFooter
            label="New Report"
            onSubmit={() => navigation.push(url("/mobile/home/manage/report/add"))}
        />
    );

    if (isLoading) {
        return (
            <>
                <div className="flex items-center justify-center py-20">
                    <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
                {footer}
            </>
        );
    }

    if (reports.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ClipboardList size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No reports filed today.</p>
                </div>
                {footer}
            </>
        );
    }

    return (
        <>
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4">
                <ul className="space-y-3">
                    {reports.map((r) => (
                        <li key={r.id} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {INCIDENT_CATEGORY_LABELS[r.category]}
                                </p>
                            </div>
                            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        {footer}
        </>
    );
}
