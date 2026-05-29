"use client";

import { useStore } from "@/lib/context/StoreContext";
import { useSupplyRequests } from "@/lib/hooks/requests/useSupplyRequests";
import { SUPPLY_REQUEST_TYPE_LABELS, SUPPLY_REQUEST_TYPES } from "@tea-pos/features/requests/schema";
import type { SupplyRequestType } from "@tea-pos/features/requests/schema";
import { PackageSearch } from "lucide-react";

export default function RequestPage() {
    const { selectedStoreId } = useStore();
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
                            {(SUPPLY_REQUEST_TYPES as readonly string[]).includes(r.type)
                                ? SUPPLY_REQUEST_TYPE_LABELS[r.type as SupplyRequestType]
                                : r.type}
                        </p>
                        {r.notes && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{r.notes}</p>
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
