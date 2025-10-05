// hooks/useStoreForm.ts
import { useState } from "react";
import { Store } from "../types/store";

export const useStoreForm = () => {
    const [showStoreForm, setShowStoreForm] = useState(false);
    const [storeForm, setStoreForm] = useState({ name: "", address: "" });
    const [editingStore, setEditingStore] = useState<Store | null>(null);

    const openCreateForm = () => {
        setEditingStore(null);
        setStoreForm({ name: "", address: "" });
        setShowStoreForm(true);
    };

    const openEditForm = (store: Store) => {
        setEditingStore(store);
        setStoreForm({ name: store.name, address: store.address || "" });
        setShowStoreForm(true);
    };

    const closeForm = () => {
        setShowStoreForm(false);
        setEditingStore(null);
        setStoreForm({ name: "", address: "" });
    };

    return {
        showStoreForm,
        storeForm,
        editingStore,
        openCreateForm,
        openEditForm,
        closeForm,
        setStoreForm,
    };
};
