// lib/hooks/tenants/useUserTenants.ts
import useSWR from "swr";
import { Tenant, TenantListResponse } from "@/lib/shared/schemas/tenants";

async function fetchUserTenants(userId: string | null): Promise<Tenant[]> {
    if (!userId) throw new Error("User ID is required");

    const response = await fetch(`/api/tenants`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch tenants");
    }

    const data = await response.json();

    // Validate response with Zod schema
    const validated = TenantListResponse.parse(data);
    return validated.tenants;
}

export default function useUserTenants(userId: string | null) {
    const key = userId ? `/api/tenants-${userId}` : null;

    return useSWR<Tenant[]>(key, () => fetchUserTenants(userId), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
}
