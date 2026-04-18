import { createServerComponentClient } from "@/lib/server/supabase/server";
import { redirect } from "next/navigation";

export async function checkManagerAccess() {
    const supabase = await createServerComponentClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "manager") {
        redirect("/admin/dashboard");
    }
}
