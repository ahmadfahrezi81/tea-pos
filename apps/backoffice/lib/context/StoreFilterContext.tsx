"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useStores } from "@/lib/hooks/stores/useStores";
import type { StoreResponse } from "@tea-pos/features/stores/schema";

const STORAGE_KEY = "bo:selectedStoreId";
const HIDE_KEY = "bo:hideInactiveStores";

type StoreFilterContextType = {
    /** Empty string means every active store — the screen's default. */
    selectedStoreId: string;
    setSelectedStoreId: (id: string) => void;
    selectedStore: StoreResponse | null;
    stores: StoreResponse[];
    isPickerOpen: boolean;
    setIsPickerOpen: (v: boolean) => void;
    hideInactiveStores: boolean;
    setHideInactiveStores: (v: boolean) => void;
};

const StoreFilterContext = createContext<StoreFilterContextType | null>(null);

/* Which store the tenant-wide screens are narrowed to, if any.
 *
 * The seller app picks a store to sell from and cannot work without one; the
 * backoffice picks a store to look at, and "all of them" is a real answer — so
 * the empty string is a first-class value here rather than a missing one. The
 * choice is kept in localStorage so a reload lands where it was left, and
 * dropped if it names a store that is gone or no longer active. */
export function StoreFilterProvider({ children }: { children: React.ReactNode }) {
    const { stores } = useStores();

    const [selectedStoreId, setSelectedStoreIdRaw] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem(STORAGE_KEY) ?? "";
    });
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const [hideInactiveStores, setHideInactiveStoresRaw] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        // Default ON — demo and retired shops hidden unless the user opted out.
        return localStorage.getItem(HIDE_KEY) !== "false";
    });

    const setSelectedStoreId = (id: string) => {
        localStorage.setItem(STORAGE_KEY, id);
        setSelectedStoreIdRaw(id);
    };

    const setHideInactiveStores = (v: boolean) => {
        localStorage.setItem(HIDE_KEY, String(v));
        setHideInactiveStoresRaw(v);
    };

    /* Held back until the list arrives: falling back to "all" while the fetch is
       in flight would fire a tenant-wide request the picker is about to
       replace. Membership only — a stored store that is now retired stays
       selected, since it is still a store somebody chose to look at. */
    const resolvedStoreId = useMemo(() => {
        if (!selectedStoreId || stores.length === 0) return selectedStoreId;
        return stores.some((s) => s.id === selectedStoreId) ? selectedStoreId : "";
    }, [selectedStoreId, stores]);

    const selectedStore = useMemo(
        () => stores.find((s) => s.id === resolvedStoreId) ?? null,
        [stores, resolvedStoreId],
    );

    const value = useMemo(
        () => ({
            selectedStoreId: resolvedStoreId,
            setSelectedStoreId,
            selectedStore,
            stores,
            isPickerOpen,
            setIsPickerOpen,
            hideInactiveStores,
            setHideInactiveStores,
        }),
        [resolvedStoreId, selectedStore, stores, isPickerOpen, hideInactiveStores],
    );

    return <StoreFilterContext.Provider value={value}>{children}</StoreFilterContext.Provider>;
}

export function useStoreFilter() {
    const context = useContext(StoreFilterContext);
    if (!context) throw new Error("useStoreFilter must be used within StoreFilterProvider");
    return context;
}
