import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tea-pos/db/types";

// For API routes only — service role, bypasses RLS
export function getServiceClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}
