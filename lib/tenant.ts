// lib/tenant.ts

/**
 * MIGRATION MODE: Hardcoded tenant ID
 * TODO: After migration, replace with actual tenant lookup from user_tenant_assignments
 */
const MIGRATION_TENANT_ID = "09d3d9b1-3f22-4ced-aef1-dd7a4ae0c209"; // Replace with your actual tenant ID

/**
 * Get the current tenant ID for the session
 * During migration: Returns hardcoded value
 * After migration: Should query user_tenant_assignments based on authenticated user
 */
export function getCurrentTenantId(): string {
    // TODO: Replace with actual implementation after migration
    // const user = await getUser();
    // const { data } = await supabase
    //   .from('user_tenant_assignments')
    //   .select('tenant_id')
    //   .eq('user_id', user.id)
    //   .single();
    // return data.tenant_id;

    return MIGRATION_TENANT_ID;
}

/**
 * Validates that a tenant ID is present
 * During migration: logs warning if missing
 * After migration: should throw error if missing
 */
export function validateTenantId(
    tenantId: string | null | undefined,
    context: string
): string {
    if (!tenantId) {
        console.warn(
            `[MIGRATION WARNING] Missing tenant_id in ${context}. Using fallback.`
        );
        return MIGRATION_TENANT_ID;
    }
    return tenantId;
}

/**
 * Configuration flag for migration mode
 * Set to false after backfill is complete to enable strict validation
 */
export const MIGRATION_MODE = true;
