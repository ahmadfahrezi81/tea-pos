import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

// ─── Public functions ─────────────────────────────────────────────────────────

export async function getProfile(supabase: SupabaseClient, { userId }: { userId: string }) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        const status = error.code === "PGRST116" ? 404 : 500;
        const message = error.code === "PGRST116" ? "Profile not found" : "Failed to fetch profile";
        throw Object.assign(new Error(message), { status });
    }

    if (!data) throw Object.assign(new Error("Profile not found"), { status: 404 });

    return toCamelKeys(data);
}
