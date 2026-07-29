"use client";
import { useEffect } from "react";
import { Drawer } from "vaul";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { useShellScroll } from "@tea-pos/shell/ScrollContext";
import { useStore } from "@/lib/context/StoreContext";
import { useT } from "@/lib/hooks/useT";

export function StorePickerDrawer() {
    const {
        selectedStoreId,
        setSelectedStoreId,
        assignedStores,
        isPickerOpen,
        setIsPickerOpen,
        hideInactiveStores,
        setHideInactiveStores,
    } = useStore();
    const t = useT();
    const { scrollRef } = useShellScroll();

    // Opening the drawer locks scrolling, which drops the page's position.
    // Stash it on the way in and put it back on the way out — the drawer causes
    // this, so the drawer cleans it up.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (isPickerOpen) {
            el.dataset.scrollY = String(el.scrollTop);
            return;
        }
        const saved = el.dataset.scrollY;
        if (saved !== undefined) {
            requestAnimationFrame(() => el.scrollTo(0, Number(saved)));
        }
    }, [isPickerOpen, scrollRef]);

    if (assignedStores.length === 0) return null;

    const hasHideableStores = assignedStores.some(
        (s) => s.status === "fake" || s.status === "inactive",
    );
    const visibleStores = hideInactiveStores
        ? assignedStores.filter((s) => s.status === "active")
        : assignedStores;

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
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pt-5 pb-8 focus:outline-none">
                    {/* Pull tab */}
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Drawer.Title className="text-xl font-bold text-gray-900">
                                {t("home.selectStore")}
                            </Drawer.Title>
                            {hasHideableStores && (
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={hideInactiveStores}
                                    aria-label={t("home.hideInactiveStores")}
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
                        <Drawer.Description className="sr-only">{t("home.selectStoreDesc")}</Drawer.Description>
                        <button
                            onClick={() => setIsPickerOpen(false)}
                            className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                        >
                            <X size={26} />
                        </button>
                    </div>

                    {/* <div className="h-px bg-gray-200 -mx-6 mb-3" /> */}

                    <div className="space-y-3">
                        {visibleStores.map((store, index) => {
                            const isSelected = store.id === selectedStoreId;
                            const isLast = index === visibleStores.length - 1;
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg text-gray-900">
                                            {store.name}
                                        </span>
                                        {store.status === "fake" && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 mt-0.5 rounded bg-red-100 text-red-600">
                                                DEMO
                                            </span>
                                        )}
                                        {store.status === "inactive" && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 mt-0.5 rounded bg-gray-100 text-gray-500">
                                                {t("home.storeInactive")}
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
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
