import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import Navbar from "@/components/shared/Navbar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createServerComponentClient();

    // Check if user is authenticated
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    // Get user profile for role-based access
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container">{children}</main>
        </div>
    );
}
