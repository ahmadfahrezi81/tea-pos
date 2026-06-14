"use client";

import { useStore } from "@/lib/context/StoreContext";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { INCIDENT_CATEGORIES, INCIDENT_CATEGORY_LABELS } from "@tea-pos/features/reports/schema";
import type { IncidentCategory } from "@tea-pos/features/reports/schema";
import { ClipboardList } from "lucide-react";
import { useT } from "@/lib/hooks/useT";

export default function ReportPage() {
    const { selectedStoreId } = useStore();
    const { reports, isLoading } = useIncidentReports(selectedStoreId);
    const t = useT();

    const inner = isLoading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
    ) : reports.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ClipboardList size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">{t("manage.noReports")}</p>
        </div>
    ) : (
        <ul className="divide-y divide-gray-100">
            {reports.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-800 truncate">
                            {(INCIDENT_CATEGORIES as readonly string[]).includes(r.type)
                                ? INCIDENT_CATEGORY_LABELS[r.type as IncidentCategory]
                                : r.type}
                        </p>
                        {r.notes && (
                            <p className="text-sm text-gray-500 mt-0.5 truncate">{r.notes}</p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="flex-1 bg-white rounded-2xl flex flex-col">
            {inner}
        </div>
    );
}
