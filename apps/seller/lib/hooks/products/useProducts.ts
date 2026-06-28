import useSWR from "swr";
import { productsApi } from "@/lib/api/products";
import type { Product } from "@tea-pos/features/products/schema";

export const useProducts = (all?: boolean) => {
    const key = all ? "products-all" : "products";

    return useSWR<Product[]>(
        key,
        () => productsApi.list(all ? { all: true } : {}).then((r) => r.products),
        { revalidateOnFocus: false, dedupingInterval: 300_000 },
    );
};
