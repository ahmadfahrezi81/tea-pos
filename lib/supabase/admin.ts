import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db.types";

/**
 * Supabase Service Role Client
 * -----------------------------
 * Use ONLY for backend tasks that require elevated privileges,
 * like admin auth actions or bypassing RLS.
 *
 * ⚠️ Never import this in client components or expose its key.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceRoleKey) {
        throw new Error("Missing SUPABASE environment variables.");
    }

    return createClient<Database>(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
