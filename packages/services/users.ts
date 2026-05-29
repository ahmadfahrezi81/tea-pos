import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

// ─── Public functions ─────────────────────────────────────────────────────────

export async function getUser(supabase: SupabaseClient, { userId }: { userId: string }) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        const status = error.code === "PGRST116" ? 404 : 500;
        const message = error.code === "PGRST116" ? "User not found" : "Failed to fetch user";
        throw Object.assign(new Error(message), { status });
    }

    if (!data) throw Object.assign(new Error("User not found"), { status: 404 });

    return toCamelKeys(data);
}
