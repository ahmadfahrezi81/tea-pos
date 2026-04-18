"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useStores } from "@/lib/client/hooks/stores/useStores";
import { useAuth } from "@/lib/client/context/AuthContext";
import {
    hasSellerRoleInStore,
    hasManagerRoleInStore,
} from "@/lib/shared/utils/roleUtils";

type Store = {
    id: string;
    name: string;
    status: "active" | "fake" | "inactive";
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

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const { profile } = useAuth();
    const { data: storesData } = useStores();
    const stores = storesData?.stores ?? [];
    const assignments = storesData?.assignments ?? {};

    const assignedStores = stores.filter(
        (store) =>
            hasSellerRoleInStore(profile?.id ?? "", store.id, assignments) ||
            hasManagerRoleInStore(profile?.id ?? "", store.id, assignments),
    );

    const defaultStore = stores.find((store) =>
        assignments[store.id]?.some(
            (a) => a.userId === profile?.id && a.isDefault,
        ),
    );

    const [selectedStoreId, setSelectedStoreIdRaw] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem("selectedStoreId") ?? "";
    });

    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const setSelectedStoreId = (id: string) => {
        localStorage.setItem("selectedStoreId", id);
        setSelectedStoreIdRaw(id);
    };

    useEffect(() => {
        if (!selectedStoreId && defaultStore) {
            setSelectedStoreId(defaultStore.id);
        }
    }, [defaultStore, selectedStoreId]);

    const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;

    return (
        <StoreContext.Provider
            value={{
                selectedStoreId,
                setSelectedStoreId,
                selectedStore,
                assignedStores,
                stores,
                isPickerOpen,
                setIsPickerOpen,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
}

export function useStore(): StoreContextType {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return context;
}
