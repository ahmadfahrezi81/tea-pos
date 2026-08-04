import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tea-pos/db/types";

/**
 * For API routes only — service role, bypasses RLS.
 *
 * One client per instance rather than one per request. Fluid runs several
 * invocations concurrently in the same process, so this is genuinely shared
 * state. It is safe as written: query builders return new objects per call,
 * and the key and headers are fixed at construction.
 *
 * It stops being safe the moment anything attaches per-request state to it —
 * no `auth.setSession()`, no mutating `headers`, no stashing a tenant id on
 * it. This client bypasses RLS, so a leak here crosses tenants.
 *
 * `persistSession` / `autoRefreshToken` are off because a service-role client
 * on the server has no session to persist or refresh; leaving them on makes
 * the auth sub-client set up storage and a refresh timer it never uses.
 */
let client: SupabaseClient<Database> | null = null;

export function getServiceClient() {
    client ??= createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
    );
    return client;
}
