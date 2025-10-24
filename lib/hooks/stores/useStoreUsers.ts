// lib/hooks/stores/useStoreUsers.ts
import useSWR from "swr";
import {
    StoreUser,
    ListStoreAssignmentsResponse,
} from "@/lib/schemas/userStoreAssignments";

async function fetchStoreUsers(
    storeId: string | null,
    tenantId: string | null
): Promise<StoreUser[]> {
    if (!storeId) throw new Error("Store ID is required");
    if (!tenantId) throw new Error("Tenant ID is required");

    const params = new URLSearchParams({
        tenantId,
    });

    const response = await fetch(
        `/api/stores/${storeId}/users?${params.toString()}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch store users");
    }

    const data = await response.json();

    // Validate response with Zod schema
    const validated = ListStoreAssignmentsResponse.parse(data);
    return validated.assignments;
}

export default function useStoreUsers(
    storeId: string | null,
    tenantId: string | null
) {
    const key =
        storeId && tenantId ? `/api/stores/${storeId}/users-${tenantId}` : null;

    return useSWR<StoreUser[]>(key, () => fetchStoreUsers(storeId, tenantId), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
}
