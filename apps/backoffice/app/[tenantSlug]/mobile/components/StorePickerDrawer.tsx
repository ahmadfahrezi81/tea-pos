"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useStoreFilter } from "@/lib/context/StoreFilterContext";

/* The seller's store sheet, with the row it does not have: "All Stores" sits at
   the top because tenant-wide is the backoffice's default reading, and every
   named store below it is a narrowing of that. Same eye toggle, doing the same
   job — demo and retired shops are hidden until asked for.
 *
 * Plain fixed panel rather than the seller's `vaul` drawer — every other sheet
 * in this app is built this way, and matching them is worth more than the drag
 * gesture would be. Spacing is copied from the seller's sheet exactly, pull tab
 * included: it is absolutely positioned there, so it costs no vertical room and
 * the title sits where `pt-5` puts it. */
export function StorePickerDrawer() {
    const {
        selectedStoreId,
        setSelectedStoreId,
        stores,
        isPickerOpen,
        setIsPickerOpen,
        hideInactiveStores,
        setHideInactiveStores,
    } = useStoreFilter();

    if (!isPickerOpen) return null;

    const hasHideableStores = stores.some((s) => s.status === "fake" || s.status === "inactive");
    const visibleStores = hideInactiveStores
        ? stores.filter((s) => s.status === "active" || s.id === selectedStoreId)
        : stores;

    const options = [{ id: "", name: "All Stores", status: "active" as const }, ...visibleStores];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end bg-black/60"
            onClick={() => setIsPickerOpen(false)}
        >
            <div
                className="relative w-full bg-white rounded-t-2xl px-4 pt-5 pb-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Pull tab */}
                <div className="absolute top-2 left-0 right-0 flex justify-center">
                    <div className="w-8 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <p className="text-xl font-bold text-gray-900">Select Store</p>
                        {hasHideableStores && (
                            <button
                                type="button"
                                role="switch"
                                aria-checked={hideInactiveStores}
                                aria-label="Hide demo and inactive stores"
                                onClick={() => setHideInactiveStores(!hideInactiveStores)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                    hideInactiveStores ? "bg-brand" : "bg-gray-300"
                                }`}
                            >
                                <span
                                    className={`inline-flex h-7 w-9 items-center justify-center rounded-full bg-white shadow transform transition-transform ${
                                        hideInactiveStores ? "translate-x-[18px]" : "translate-x-0.5"
                                    }`}
                                >
                                    {hideInactiveStores ? (
                                        <EyeOff size={16} className="text-brand" />
                                    ) : (
                                        <Eye size={16} className="text-gray-400" />
                                    )}
                                </span>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsPickerOpen(false)}
                        className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                    >
                        <X size={26} />
                    </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {options.map((option, index) => {
                        const isSelected = option.id === selectedStoreId;
                        const isLast = index === options.length - 1;
                        return (
                            <button
                                key={option.id || "all"}
                                onClick={() => {
                                    setSelectedStoreId(option.id);
                                    setIsPickerOpen(false);
                                }}
                                className={`w-full flex items-center justify-between py-5 mb-0 transition-colors ${
                                    !isLast ? "border-b" : ""
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-lg text-gray-900 ${
                                            option.id === "" ? "font-semibold" : ""
                                        }`}
                                    >
                                        {option.name}
                                    </span>
                                    {option.status === "fake" && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 mt-0.5 rounded bg-red-100 text-red-600">
                                            DEMO
                                        </span>
                                    )}
                                    {option.status === "inactive" && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 mt-0.5 rounded bg-gray-100 text-gray-500">
                                            INACTIVE
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected ? "border-brand/90 bg-brand/90" : "border-gray-300"
                                    }`}
                                >
                                    {isSelected && (
                                        <Check size={16} className="text-white" strokeWidth={4} />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
