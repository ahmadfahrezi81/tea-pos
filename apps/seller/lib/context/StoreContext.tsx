"use client";
import { createContext, useContext, useState, useMemo } from "react";
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
};

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
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

    const [selectedStoreId, setSelectedStoreIdRaw] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        const stored = localStorage.getItem("selectedStoreId") ?? "";
        return stored;
    });

    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const setSelectedStoreId = (id: string) => {
        localStorage.setItem("selectedStoreId", id);
        setSelectedStoreIdRaw(id);
    };

    // If stored ID doesn't match any known store, use default.
    // Handles env switches (staging vs prod) and removed stores.
    const resolvedStoreId = useMemo(() => {
        if (!storesData) return selectedStoreId;
        const isValid = stores.some((s) => s.id === selectedStoreId);
        if (isValid) return selectedStoreId;
        if (defaultStoreId) {
            localStorage.setItem("selectedStoreId", defaultStoreId);
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
        }),
        [resolvedStoreId, selectedStore, stores, isPickerOpen],
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
