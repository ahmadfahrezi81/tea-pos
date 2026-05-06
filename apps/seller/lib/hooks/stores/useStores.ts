import useSWR from "swr";
import { storesApi } from "@/lib/api/stores";
import type { StoreListResponse } from "@tea-pos/features/stores/schema";

export function useStores() {
    return useSWR<StoreListResponse>("stores-all", () => storesApi.list(), {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });
}
