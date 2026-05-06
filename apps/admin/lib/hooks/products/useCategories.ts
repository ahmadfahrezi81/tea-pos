// lib/hooks/categories/useCategories.ts
import useSWR from "swr";
import { CategoryResponse as Category } from "@tea-pos/features/products/categories-schema";

const fetcher = async (url: string): Promise<Category[]> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch categories");
    }
    const data = await response.json();
    return data.categories;
};

export function useCategories() {
    const { data, error, isLoading, mutate } = useSWR<Category[]>(
        "/api/product-categories",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );

    return {
        data,
        error,
        isLoading,
        mutate,
    };
}
