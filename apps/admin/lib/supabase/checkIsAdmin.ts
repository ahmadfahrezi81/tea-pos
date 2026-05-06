import { SupabaseClient } from "@supabase/supabase-js";

export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) return false;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    return profile?.role === "ADMIN";
}
