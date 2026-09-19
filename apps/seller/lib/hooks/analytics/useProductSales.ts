import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";
import type { ProductSalesResponse } from "@tea-pos/features/analytics/schema";
import { SWR } from "@tea-pos/utils/swr";

export interface ProductSalesData {
    productId: string;
    productName: string;
    quantity: number;
    percentage: number;
}

export default function useProductSales(storeId: string | null, month: string) {
    const key = storeId && month ? `product-sales-${storeId}-${month}` : null;

    return useSWR<ProductSalesResponse>(
        key,
        () => analyticsApi.getProductSales({ storeId: storeId!, month }),
        {
            dedupingInterval: SWR.COLD,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
