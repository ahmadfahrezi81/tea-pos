// // lib/tenant.ts

// /**
//  * MIGRATION MODE: Hardcoded tenant ID
//  * TODO: After migration, replace with actual tenant lookup from user_tenant_assignments
//  */
// const MIGRATION_TENANT_ID = "09d3d9b1-3f22-4ced-aef1-dd7a4ae0c209"; // Replace with your actual tenant ID

// /**
//  * Get the current tenant ID for the session
//  * During migration: Returns hardcoded value
//  * After migration: Should query user_tenant_assignments based on authenticated user
//  */
// export function getCurrentTenantId(): string {
//     // TODO: Replace with actual implementation after migration
//     // const user = await getUser();
//     // const { data } = await supabase
//     //   .from('user_tenant_assignments')
//     //   .select('tenant_id')
//     //   .eq('user_id', user.id)
//     //   .single();
//     // return data.tenant_id;

//     return MIGRATION_TENANT_ID;
// }

// /**
//  * Validates that a tenant ID is present
//  * During migration: logs warning if missing
//  * After migration: should throw error if missing
//  */
// export function validateTenantId(
//     tenantId: string | null | undefined,
//     context: string
// ): string {
//     if (!tenantId) {
//         console.warn(
//             `[MIGRATION WARNING] Missing tenant_id in ${context}. Using fallback.`
//         );
//         return MIGRATION_TENANT_ID;
//     }
//     return tenantId;
// }

// /**
//  * Configuration flag for migration mode
//  * Set to false after backfill is complete to enable strict validation
//  */
// export const MIGRATION_MODE = true;

// lib/tenant.ts
import { cookies } from "next/headers";

/**
 * Get the current tenant ID from the cookie
 * The cookie is set by the tenant layout after validating the slug
 *
 * For API routes: Reads from cookie set by middleware
 * For Server Components: Reads from cookie set by layout
 */
export async function getCurrentTenantId(): Promise<string> {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get("x-tenant-id")?.value;

    if (!tenantId) {
        throw new Error(
            "Tenant ID not found in session. Please ensure you are accessing the app through a valid tenant URL (e.g., /tealicious/...)"
        );
    }

    return tenantId;
}

/**
 * Get tenant ID with a fallback (for migration/testing)
 * Use this sparingly - prefer getCurrentTenantId() which throws on missing tenant
 */
export async function getTenantIdOrFallback(
    fallbackId: string
): Promise<string> {
    try {
        return await getCurrentTenantId();
    } catch {
        console.warn("[TENANT] Using fallback tenant ID");
        return fallbackId;
    }
}

/**
 * Validate that a tenant_id matches the current session
 * Useful for authorization checks
 */
export async function validateTenantAccess(
    resourceTenantId: string
): Promise<boolean> {
    try {
        const currentTenantId = await getCurrentTenantId();
        return resourceTenantId === currentTenantId;
    } catch {
        return false;
    }
}
