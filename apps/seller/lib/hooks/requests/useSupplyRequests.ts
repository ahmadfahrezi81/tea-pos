import useSWR from "swr";
import { requestsApi } from "@/lib/api/requests";
import type { CreateSupplyRequestInput, SupplyRequestResponse } from "@tea-pos/features/requests/schema";

export function useSupplyRequests(storeId?: string, date?: string) {
    const { data, error, mutate, isLoading } = useSWR(
        storeId ? `supply-requests-${storeId}-${date ?? "today"}` : null,
        () => requestsApi.list({ storeId: storeId!, date }),
        { revalidateOnFocus: false, dedupingInterval: 10000 },
    );

    const create = async (input: Omit<CreateSupplyRequestInput, "storeId">): Promise<SupplyRequestResponse> => {
        const result = await requestsApi.create({ storeId: storeId!, ...input });
        await mutate();
        return result;
    };

    return {
        requests: data?.requests ?? [],
        isLoading,
        error,
        mutate,
        create,
    };
}
