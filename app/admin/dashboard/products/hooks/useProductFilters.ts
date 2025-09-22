// hooks/useProductFilters.ts
import { useState, useMemo } from "react";
import { Product } from "../types/product";

export type ProductStatus = "all" | "active" | "inactive";

export const useProductFilters = (products: Product[]) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<ProductStatus>("all");

    const filteredProducts = useMemo(() => {
        let filtered = products;

        // Filter by search query (name)
        if (searchQuery) {
            filtered = filtered.filter((product) =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by status
        if (selectedStatus !== "all") {
            filtered = filtered.filter((product) =>
                selectedStatus === "active"
                    ? product.is_active
                    : !product.is_active
            );
        }

        return filtered;
    }, [products, searchQuery, selectedStatus]);

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedStatus("all");
    };

    return {
        searchQuery,
        setSearchQuery,
        selectedStatus,
        setSelectedStatus,
        filteredProducts,
        clearFilters,
    };
};
