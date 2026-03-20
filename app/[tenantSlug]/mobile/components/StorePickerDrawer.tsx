"use client";
import { Drawer } from "vaul";
import { Check, Store } from "lucide-react";
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
                if (!open) {
                    const scrollY = window.scrollY;
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollY);
                    });
                }
            }}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-6 py-8 focus:outline-none">
                    <Drawer.Title className="text-xl font-bold text-gray-900 mb-4">
                        <Store
                            size={18}
                            className="inline text-gray-700 mb-1"
                        />
                        <span className="ml-1.5">Select Store</span>
                    </Drawer.Title>

                    <div className="space-y-3">
                        {assignedStores.map((store, index) => {
                            const isSelected = store.id === selectedStoreId;
                            const isLast = index === assignedStores.length - 1;
                            return (
                                <button
                                    key={store.id}
                                    onClick={() => {
                                        setSelectedStoreId(store.id);
                                        setIsPickerOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between py-5 mb-0 transition-colors ${
                                        !isLast ? "border-b" : ""
                                    }`}
                                >
                                    <span className="text-lg text-gray-900">
                                        {store.name}
                                    </span>
                                    <span
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected
                                                ? "border-brand/90 bg-brand/90"
                                                : "border-gray-300"
                                        }`}
                                    >
                                        {isSelected && (
                                            <Check
                                                size={16}
                                                className="text-white"
                                                strokeWidth={4}
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
