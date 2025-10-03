// lib/hooks/tenants/useTenantInvites.ts
import useSWR from "swr";
import {
    TenantInvite,
    TenantInviteListResponse,
} from "@/lib/schemas/tenantInvites";

async function fetchTenantInvites(
    tenantId: string | null
): Promise<TenantInvite[]> {
    if (!tenantId) throw new Error("Tenant ID is required");

    const response = await fetch(`/api/tenant-invites?tenantId=${tenantId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch tenant invites");
    }

    const data = await response.json();

    // Validate response with Zod schema
    const validated = TenantInviteListResponse.parse(data);
    return validated.invites;
}

export default function useTenantInvites(tenantId: string | null) {
    const key = tenantId ? `/api/tenant-invites-${tenantId}` : null;

    return useSWR<TenantInvite[]>(key, () => fetchTenantInvites(tenantId), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
}
