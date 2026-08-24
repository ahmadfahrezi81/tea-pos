"use client";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useStores } from "@/lib/hooks/stores/useStores";
import { useAuth } from "@/lib/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Store = {
    id: string;
    name: string;
    status: "active" | "fake" | "inactive";
    openTime: string;
    closeTime: string;
};

type StoreContextType = {
    selectedStoreId: string;
    setSelectedStoreId: (id: string) => void;
    selectedStore: Store | null;
    assignedStores: Store[];
    stores: Store[];
    isPickerOpen: boolean;
    setIsPickerOpen: (v: boolean) => void;
    hideInactiveStores: boolean;
    setHideInactiveStores: (v: boolean) => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Mirrors the selected store into a cookie so the server render can pick the
 * same one the browser last used. localStorage is written too and stays the
 * value people carry between sessions; the cookie exists only so that server
 * and client agree on the *first* render.
 *
 * Without it the two disagree: the server has no localStorage, so it resolves to
 * the default store while the browser resolves to whatever was picked last — a
 * hydration mismatch on the store name in the header, and a frame of data
 * fetched for the wrong store.
 */
function persistStoreId(id: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedStoreId", id);
    document.cookie = `selectedStoreId=${id}; path=/; max-age=31536000`;
}

export function StoreProvider({
    children,
    initialSelectedStoreId = "",
}: {
    children: React.ReactNode;
    /** From the `selectedStoreId` cookie, read by the mobile layout. */
    initialSelectedStoreId?: string;
}) {
    const { user } = useAuth();
    const { data: storesData } = useStores();

    const userId = user?.id ?? "";

    const stores = useMemo(() => storesData?.stores ?? [], [storesData]);
    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData],
    );

    const assignedStores = stores;

    const defaultStoreId = useMemo(() => {
        const found = stores.find((store) =>
            assignments[store.id]?.some(
                (a) => a.userId === userId && a.isDefault,
            ),
        );
        return found?.id ?? null;
    }, [stores, assignments, userId]);

    /* Seeded from the cookie, not from localStorage: this initialiser runs on
       the server too, and reading browser-only storage there would make the
       first client render differ from the HTML sent to it. Anyone who predates
       the cookie is migrated by the effect below. */
    const [selectedStoreId, setSelectedStoreIdRaw] =
        useState<string>(initialSelectedStoreId);

    /* One-time migration. Someone who chose a store before this cookie existed
       has the id in localStorage only. Without this they would silently be moved
       to their default store on the first boot after this shipped, which for a
       multi-store seller means looking at the wrong shop.
     *
     * The alternative — reading localStorage in the initialiser above — makes
     * the first client render disagree with the server HTML for exactly these
     * users, trading one extra render for a hydration error. `set-state-in-effect`
     * guards against cascading renders; this one cascades once, ever, per
     * device, and then the cookie makes it dead code. */
    useEffect(() => {
        if (initialSelectedStoreId) return;
        const stored = localStorage.getItem("selectedStoreId");
        if (!stored) return;
        persistStoreId(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedStoreIdRaw(stored);
    }, [initialSelectedStoreId]);

    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const [hideInactiveStores, setHideInactiveStoresRaw] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        // Default ON — demo/inactive stores hidden unless the user opted out.
        const stored = localStorage.getItem("hideInactiveStores");
        return stored === null ? true : stored === "true";
    });

    const setSelectedStoreId = (id: string) => {
        persistStoreId(id);
        setSelectedStoreIdRaw(id);
    };

    const setHideInactiveStores = (v: boolean) => {
        localStorage.setItem("hideInactiveStores", String(v));
        setHideInactiveStoresRaw(v);
    };

    // If stored ID doesn't match any known store, use default.
    // Handles env switches (staging vs prod) and removed stores.
    const resolvedStoreId = useMemo(() => {
        if (!storesData) return selectedStoreId;
        const isValid = stores.some((s) => s.id === selectedStoreId);
        if (isValid) return selectedStoreId;
        if (defaultStoreId) {
            /* Write guarded inside `persistStoreId`. This memo now runs during
               SSR as well — the store list arrives with the layout, so
               `storesData` is populated and no longer short-circuits above. */
            persistStoreId(defaultStoreId);
            return defaultStoreId;
        }
        return selectedStoreId;
    }, [storesData, stores, selectedStoreId, defaultStoreId]);

    const selectedStore = useMemo(
        () => stores.find((s) => s.id === resolvedStoreId) ?? null,
        [stores, resolvedStoreId],
    );

    const value = useMemo(
        () => ({
            selectedStoreId: resolvedStoreId,
            setSelectedStoreId,
            selectedStore,
            assignedStores,
            stores,
            isPickerOpen,
            setIsPickerOpen,
            hideInactiveStores,
            setHideInactiveStores,
        }),
        [resolvedStoreId, selectedStore, stores, isPickerOpen, hideInactiveStores],
    );

    return (
        <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStore(): StoreContextType {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return context;
}
