"use client";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useSWRConfig } from "swr";
import { useStores } from "@/lib/hooks/stores/useStores";
import { storesApi } from "@/lib/api/stores";
import { useAuth } from "@/lib/context/AuthContext";
import type { StoreListResponse } from "@tea-pos/features/stores/schema";

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
    /**
     * Rejects if the choice could not be saved, having already put the previous
     * store back. The caller surfaces it — `StoreProvider` sits above
     * `ErrorSheetProvider` and cannot.
     */
    setSelectedStoreId: (id: string) => Promise<void>;
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
 *
 * Since task 064 the durable record is `is_default` in the database, and both of
 * these are caches of it — which is what `locale` is to
 * `users.preferred_language`. They still matter: the cookie is what the server
 * render can read, and both answer while the row says nothing.
 */
function persistStoreId(id: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedStoreId", id);
    document.cookie = `selectedStoreId=${id}; path=/; max-age=31536000`;
}

/**
 * The store list with `storeId` marked as this user's default and every other
 * row cleared — the shape the server will hold once the write lands, so the UI
 * can move before it does.
 *
 * Rebuilt rather than mutated: this object is in the SWR cache, and the failure
 * path puts the original back by identity.
 */
function withDefault(
    data: StoreListResponse | undefined,
    userId: string,
    storeId: string,
): StoreListResponse | undefined {
    if (!data) return data;
    const assignments: StoreListResponse["assignments"] = {};
    Object.entries(data.assignments).forEach(([id, rows]) => {
        assignments[id] = rows.map((row) =>
            row.userId === userId ? { ...row, isDefault: id === storeId } : row,
        );
    });
    return { ...data, assignments };
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
    const { mutate } = useSWRConfig();

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
     * Narrower since task 064: `is_default` now outranks both of these, so this
     * only decides anything for a user whose row is still unwritten.
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

    const setHideInactiveStores = (v: boolean) => {
        localStorage.setItem("hideInactiveStores", String(v));
        setHideInactiveStoresRaw(v);
    };

    /* Resolution order, and the first two rungs swapped in task 064.
     *
     * 1. `is_default`, the row the picker writes. It outranks the cookie, and
     *    that ordering *is* the cross-device feature: a phone that has been used
     *    once always has a cookie, so while the cookie won first, a choice made
     *    on another device could never be seen. Last-write-wins on the next
     *    load, not live — a screen sitting open does not move.
     * 2. The cookie, for anyone whose row says nothing yet: every user on the
     *    day 064 shipped, and anyone whose write failed.
     * 3. Any assigned store, preferring an active one. This is the rung that
     *    was missing, and its absence was the bug: with nothing here the chain
     *    returned "", `selectedStore` was null, and `MobileLayoutClient` renders
     *    the header accessory only when it is not — so the button that opens the
     *    picker was itself behind having already picked. The device could not
     *    fix itself and someone had to edit Supabase by hand.
     *
     *    Active by preference because the picker hides `fake` and `inactive`
     *    stores by default, so landing on one selects a store the user cannot
     *    see selected — a stranger state than the one being fixed.
     *
     * Also still handles a stored id that matches nothing: env switches between
     * staging and prod, and stores that have been removed.
     */
    const resolvedStoreId = useMemo(() => {
        if (!storesData) return selectedStoreId;

        if (defaultStoreId) {
            /* Write guarded inside `persistStoreId`. This memo now runs during
               SSR as well — the store list arrives with the layout, so
               `storesData` is populated and no longer short-circuits above. */
            persistStoreId(defaultStoreId);
            return defaultStoreId;
        }

        if (stores.some((s) => s.id === selectedStoreId)) return selectedStoreId;

        const fallback = stores.find((s) => s.status === "active") ?? stores[0];
        if (fallback) {
            persistStoreId(fallback.id);
            return fallback.id;
        }

        return selectedStoreId;
    }, [storesData, stores, selectedStoreId, defaultStoreId]);

    /**
     * Optimistic, because the drawer should close on the tap rather than on the
     * round trip.
     *
     * The optimism lives in the SWR cache rather than in a second piece of state:
     * `defaultStoreId` is derived from those rows and now outranks everything
     * else, so a local state update alone would be overruled by the stale cache
     * on the very next render. Rewriting the rows moves the selection and makes
     * the revert a matter of putting the old rows back — one mechanism instead
     * of two that have to agree.
     *
     * A failure has to be visible. Once the row outranks the cookie, a write
     * that silently did not land means the next navigation restores the old
     * store, and a seller can ring cups against the wrong shop without ever
     * seeing a wrong thing on screen. So this reverts and rethrows, and the
     * caller shows the error.
     */
    const setSelectedStoreId = async (id: string) => {
        const previous = storesData;

        persistStoreId(id);
        setSelectedStoreIdRaw(id);
        await mutate("stores-all", withDefault(previous, userId, id), {
            revalidate: false,
        });

        try {
            await storesApi.setDefault(id);
        } catch (error) {
            await mutate("stores-all", previous, { revalidate: false });
            if (resolvedStoreId) persistStoreId(resolvedStoreId);
            setSelectedStoreIdRaw(resolvedStoreId);
            throw error;
        }
    };

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
