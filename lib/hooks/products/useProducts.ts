// lib/hooks/useProducts.ts
import useSWR from "swr";
import { Product, ProductListResponse } from "@/lib/schemas/products";

interface FetchProductsParams {
    all?: boolean;
}

const fetchProducts = async (
    params?: FetchProductsParams
): Promise<Product[]> => {
    const searchParams = new URLSearchParams();
    if (params?.all) {
        searchParams.append("all", "true");
    }

    const url = searchParams.toString()
        ? `/api/products?${searchParams.toString()}`
        : "/api/products";

    const res = await fetch(url);
    if (!res.ok) {
        let errMsg = `Failed to fetch products: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    // ✅ validate client-side (optional, since backend already validates)
    const parsed = ProductListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid products response on client:",
            parsed.error.format()
        );
        return [];
    }

    return parsed.data.products;
};

export const useProducts = (all?: boolean) => {
    const key = all ? "products-all" : "products";

    return useSWR<Product[]>(key, () => fetchProducts({ all }), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
};
