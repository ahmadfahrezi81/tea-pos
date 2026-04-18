// lib/hooks/tenants/useTenantUsers.ts
import useSWR from "swr";
import {
    UserTenantAssignment,
    UserTenantAssignmentListResponse,
} from "@/lib/shared/schemas/userTenantAssignments";

async function fetchTenantUsers(
    tenantId: string | null,
): Promise<UserTenantAssignment[]> {
    if (!tenantId) throw new Error("Tenant ID is required");

    const response = await fetch(
        `/api/user-tenant-assignments?tenantId=${tenantId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        },
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch tenant users");
    }

    const data = await response.json();

    // Validate response with Zod schema
    const validated = UserTenantAssignmentListResponse.parse(data);
    return validated.assignments;
}

export default function useTenantUsers(tenantId: string | null) {
    const key = tenantId ? `/api/user-tenant-assignments-${tenantId}` : null;

    return useSWR<UserTenantAssignment[]>(
        key,
        () => fetchTenantUsers(tenantId),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        },
    );
}
