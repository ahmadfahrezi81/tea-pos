import { cookies } from "next/headers";

/**
 * Get the current tenant ID from the cookie
 * The cookie is set by the tenant layout after validating the slug
 *
 * For API routes: Reads from cookie set by middleware
 * For Server Components: Reads from cookie set by layout
 *
 * The seller app's cookie value is `${tenantSlug}:${tenantId}` (added so
 * proxy.ts can skip a DB lookup when the slug already matches); backoffice
 * still writes a bare tenant id. Since UUIDs never contain a colon, splitting
 * on the first one and taking what's after it is safe for both formats.
 */
export async function getCurrentTenantId(): Promise<string> {
    const cookieStore = await cookies();
    const raw = cookieStore.get("x-tenant-id")?.value;

    if (!raw) {
        throw new Error(
            "Tenant ID not found in session. Please ensure you are accessing the app through a valid tenant URL (e.g., /tealicious/...)"
        );
    }

    const separatorIndex = raw.indexOf(":");
    return separatorIndex === -1 ? raw : raw.slice(separatorIndex + 1);
}
