"use client";

import { useStore } from "@/lib/context/StoreContext";
import { useSupplyRequests } from "@/lib/hooks/requests/useSupplyRequests";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { SUPPLY_REQUEST_TYPE_LABELS } from "@tea-pos/features/requests/schema";
import { FormFooter } from "@/components/shared/FormFooter";
import { PackageSearch } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    acknowledged: "Acknowledged",
    fulfilled: "Fulfilled",
};

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    acknowledged: "bg-blue-50 text-blue-700",
    fulfilled: "bg-green-50 text-green-700",
};

export default function RequestPage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();
    const { requests, isLoading } = useSupplyRequests(selectedStoreId);

    const footer = (
        <FormFooter
            label="New Request"
            onSubmit={() => navigation.push(url("/mobile/home/manage/request/add"))}
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

    if (requests.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <PackageSearch size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No supply requests today.</p>
                </div>
                {footer}
            </>
        );
    }

    return (
        <>
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-3">
                <ul className="space-y-2">
                    {requests.map((r) => (
                        <li key={r.id} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">
                                    {SUPPLY_REQUEST_TYPE_LABELS[r.type]}
                                </p>
                                {r.notes && (
                                    <p className="text-xs text-gray-500 truncate">{r.notes}</p>
                                )}
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
