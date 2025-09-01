// app/dashboard/analytics/layout.tsx
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function AnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // const supabase = await createServerComponentClient();

    // const {
    //     data: { user },
    // } = await supabase.auth.getUser();

    // if (!user) {
    //     redirect("/login");
    // }

    // // Check if user is manager - only managers can access analytics
    // const { data: profile } = await supabase
    //     .from("profiles")
    //     .select("role")
    //     .eq("id", user.id)
    //     .single();

    // if (!profile || profile.role !== "manager") {
    //     redirect("/admin/dashboard");
    // }

    return <>{children}</>;
}
