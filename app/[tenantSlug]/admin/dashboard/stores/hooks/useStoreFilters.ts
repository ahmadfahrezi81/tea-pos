// hooks/useStoreFilters.ts
import { useState, useMemo } from "react";
import { Assignment, Store } from "../types/store";

export const useStoreFilters = (
    stores: Store[],
    assignments: Record<string, Assignment[]>
) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const filteredStores = useMemo(() => {
        let filtered = stores;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(
                (store) =>
                    store.name.toLowerCase().includes(query) ||
                    (store.address &&
                        store.address.toLowerCase().includes(query))
            );
        }

        // Filter by user assignment
        if (selectedUserId) {
            filtered = filtered.filter((store) => {
                const storeAssignments = assignments[store.id] || [];
                return storeAssignments.some(
                    (assignment) => assignment.user_id === selectedUserId
                );
            });
        }

        return filtered;
    }, [stores, assignments, searchQuery, selectedUserId]);

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedUserId(null);
    };

    return {
        searchQuery,
        setSearchQuery,
        selectedUserId,
        setSelectedUserId,
        filteredStores,
        clearFilters,
        hasActiveFilters: Boolean(searchQuery || selectedUserId),
    };
};
