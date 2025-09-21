// hooks/useStoreAssignment.ts
import { useState } from "react";
import { Store } from "../types/store";

export const useStoreAssignment = () => {
    const [showStoreAssignmentForm, setShowStoreAssignmentForm] =
        useState(false);
    const [selectedStoreForAssignment, setSelectedStoreForAssignment] =
        useState<Store | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const openAssignmentModal = (store: Store) => {
        setSelectedStoreForAssignment(store);
        setSearchQuery("");
        setShowStoreAssignmentForm(true);
    };

    const closeAssignmentModal = () => {
        setShowStoreAssignmentForm(false);
        setSelectedStoreForAssignment(null);
        setSearchQuery("");
    };

    return {
        showStoreAssignmentForm,
        selectedStoreForAssignment,
        searchQuery,
        openAssignmentModal,
        closeAssignmentModal,
        setSearchQuery,
    };
};
