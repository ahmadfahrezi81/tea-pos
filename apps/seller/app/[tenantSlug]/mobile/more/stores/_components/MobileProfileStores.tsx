"use client";
import { useStores } from "@/lib/hooks/stores/useStores";
import { Store } from "lucide-react";

export default function MobileProfileStores() {
    const { data: storeData, isLoading } = useStores();
    const stores = storeData?.stores ?? [];
    const assignments = storeData?.assignments ?? {};

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl divide-y divide-slate-100">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                            </div>
                        </div>
                    ))
                ) : stores.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-400">No stores assigned yet.</p>
                ) : (
                    stores.map((store) => {
                        const isDefault = assignments[store.id]?.some((a) => a.isDefault);
                        return (
                            <div key={store.id} className="flex items-center gap-3 px-4 py-4">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                    <Store size={16} strokeWidth={2} className="text-gray-500" />
                                </div>
                                <p className="flex-1 text-[15px] font-medium text-gray-800">{store.name}</p>
                                {isDefault && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        Default
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
