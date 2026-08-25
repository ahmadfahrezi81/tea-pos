"use client";

import { useStoreFilter } from "@/lib/context/StoreFilterContext";
import { useDailySales } from "@/lib/hooks/home/useHome";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

/* The numbers the chart beside it only implies: what was sold over the same
   fortnight, in orders, cups and money. Same SWR key and window as the chart,
   so the pair costs one request between them.

   Orders and cups share a row because they are the same kind of count and read
   as a pair; takings get the row below to themselves, where rupiah has the full
   width it needs. Colours are the POS daily-summary palette — blue orders,
   orange cups, green takings — so the same number means the same thing in both
   apps. */

const DAYS = 14;

export default function Totals() {
    const { selectedStoreId } = useStoreFilter();
    const { totals, isLoading } = useDailySales(DAYS, selectedStoreId);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-3 aspect-square">
                <Skeleton className="h-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-3 aspect-square flex flex-col">
            <p className="text-xs font-medium text-gray-500">Last {DAYS} days</p>

            <div className="flex-1 flex flex-col justify-center gap-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Orders
                        </p>
                        <p className="text-xl font-bold tracking-tight text-blue-600">
                            {(totals?.orders ?? 0).toLocaleString("id-ID")}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Cups
                        </p>
                        <p className="text-xl font-bold tracking-tight text-orange-600">
                            {(totals?.cups ?? 0).toLocaleString("id-ID")}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Sales
                    </p>
                    {/* Rupiah runs to eight digits where a cup count runs to
                        four, so takings drop a size to stay on one line. */}
                    <p className="text-lg font-bold tracking-tight text-green-600 truncate">
                        Rp {(totals?.sales ?? 0).toLocaleString("id-ID")}
                    </p>
                </div>
            </div>
        </div>
    );
}
