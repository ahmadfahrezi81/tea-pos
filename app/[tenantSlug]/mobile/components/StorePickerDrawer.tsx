"use client";
import { Drawer } from "vaul";
import { Check, ChevronsUpDown } from "lucide-react";
import { useStore } from "@/lib/context/StoreContext";

export function StorePickerDrawer() {
    const {
        selectedStoreId,
        setSelectedStoreId,
        assignedStores,
        isPickerOpen,
        setIsPickerOpen,
    } = useStore();

    if (assignedStores.length === 0) return null;

    const selectedStore = assignedStores.find((s) => s.id === selectedStoreId);

    return (
        <Drawer.Root
            open={isPickerOpen}
            onOpenChange={(open) => {
                setIsPickerOpen(open);
                // Fix scroll jump on close
                if (!open) {
                    const scrollY = window.scrollY;
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollY);
                    });
                }
            }}
        >
            <Drawer.Trigger asChild>
                <button
                    className={`w-full p-3 border rounded-lg text-left flex items-center justify-between ${
                        assignedStores.length === 1
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                            : "border-gray-300 bg-white"
                    }`}
                    disabled={assignedStores.length === 1}
                >
                    <span>{selectedStore?.name ?? "Select Store"}</span>
                    {assignedStores.length > 1 && (
                        <ChevronsUpDown size={18} className="text-blue-500" />
                    )}
                </button>
            </Drawer.Trigger>

            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pt-5 pb-10 focus:outline-none">
                    <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

                    <Drawer.Title className="text-xl font-bold text-gray-900 mb-1">
                        Select Store
                    </Drawer.Title>
                    <Drawer.Description className="text-sm text-gray-500 mb-5">
                        Tap a store to switch. Changes apply everywhere.
                    </Drawer.Description>

                    <div className="space-y-3">
                        {assignedStores.map((store) => {
                            const isSelected = store.id === selectedStoreId;
                            return (
                                <button
                                    key={store.id}
                                    onClick={() => {
                                        setSelectedStoreId(store.id);
                                        setIsPickerOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        isSelected
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-100 bg-gray-50 active:bg-gray-100"
                                    }`}
                                >
                                    <span
                                        className={`text-base font-medium ${
                                            isSelected
                                                ? "text-blue-700"
                                                : "text-gray-800"
                                        }`}
                                    >
                                        {store.name}
                                    </span>
                                    <span
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected
                                                ? "bg-blue-500"
                                                : "bg-gray-200"
                                        }`}
                                    >
                                        {isSelected && (
                                            <Check
                                                size={18}
                                                className="text-white"
                                                strokeWidth={3}
                                            />
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
