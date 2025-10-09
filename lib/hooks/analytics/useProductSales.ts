// lib/hooks/analytics/useProductSales.ts
import useSWR from "swr";

export interface ProductSalesData {
    productId: string;
    productName: string;
    quantity: number;
    percentage: number;
}

interface UseProductSalesParams {
    storeId: string | null;
    month: string; // Format: YYYY-MM
}

interface ProductSalesResponse {
    data: ProductSalesData[];
    totalQuantity: number;
}

const fetchProductSales = async ({
    storeId,
    month,
}: UseProductSalesParams): Promise<ProductSalesResponse> => {
    if (!storeId || !month) {
        return { data: [], totalQuantity: 0 };
    }

    const params = new URLSearchParams();
    params.append("storeId", storeId);
    params.append("month", month);

    const res = await fetch(
        `/api/analytics/product-sales?${params.toString()}`
    );

    if (!res.ok) {
        let errMsg = `Failed to fetch product sales: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    return json;
};

export default function useProductSales(storeId: string | null, month: string) {
    const key = storeId && month ? `product-sales-${storeId}-${month}` : null;

    return useSWR<ProductSalesResponse>(
        key,
        () => fetchProductSales({ storeId, month }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 min
            refreshInterval: 0, //Disable polling (this assumes daily sales are not changing every second)
            keepPreviousData: true,
        }
    );
}
