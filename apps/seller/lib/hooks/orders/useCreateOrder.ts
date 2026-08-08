import { useState } from "react";
import { mutate } from "swr";
import { ordersApi } from "@/lib/api/orders";
import { matchStoreOrders } from "@/lib/hooks/orders/useStoreOrders";
import { getCurrentLocalMonth } from "@tea-pos/utils/time";
import type { CreateOrderInput, CreateOrderResponse } from "@tea-pos/features/orders/schema";

export function useCreateOrder() {
    const [isProcessing, setIsProcessing] = useState(false);

    const createOrder = async (
        input: CreateOrderInput,
        onSuccess?: (data: CreateOrderResponse) => void,
    ): Promise<CreateOrderResponse | null> => {
        setIsProcessing(true);
        try {
            const data = await ordersApi.create(input);
            if (data.success) {
                await mutate(matchStoreOrders(input.storeId));
                await mutate(`summaries-${input.storeId}-${getCurrentLocalMonth()}`);
                onSuccess?.(data);
            }
            return data;
        } catch {
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    return { createOrder, isProcessing };
}
