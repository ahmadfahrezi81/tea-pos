"use client";
import { useStores } from "@/lib/hooks/stores/useStores";
import { Store } from "lucide-react";
import { useT } from "@/lib/hooks/useT";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

export default function MyStores() {
    const { data: storeData, isLoading } = useStores();
    const stores = storeData?.stores ?? [];
    const t = useT();

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl divide-y divide-slate-100">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-4">
                            <Skeleton delay={i * 90} className="w-9 h-9 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton delay={i * 90 + 60} className="h-3.5 w-32 rounded" />
                                <Skeleton delay={i * 90 + 120} className="h-3 w-16 rounded" />
                            </div>
                        </div>
                    ))
                ) : stores.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-400">{t("more.noStores")}</p>
                ) : (
                    stores.map((store) => (
                        <div key={store.id} className="flex items-center gap-3 px-4 py-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                <Store size={16} strokeWidth={2} className="text-gray-500" />
                            </div>
                            <p className="flex-1 text-[15px] font-medium text-gray-800">{store.name}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
