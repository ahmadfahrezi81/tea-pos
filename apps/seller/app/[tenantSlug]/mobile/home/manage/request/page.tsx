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

    const inner = isLoading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
    ) : requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <PackageSearch size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No supply requests today.</p>
        </div>
    ) : (
        <ul className="divide-y divide-gray-100">
            {requests.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-800">
                            {SUPPLY_REQUEST_TYPE_LABELS[r.type]}
                        </p>
                        {r.notes && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{r.notes}</p>
                        )}
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                    </span>
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
                label="New Request"
                onSubmit={() => navigation.push(url("/mobile/home/manage/request/add"))}
            />
        </>
    );
}
