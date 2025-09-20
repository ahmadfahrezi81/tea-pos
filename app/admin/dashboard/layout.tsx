import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
// import Navbar from "@/components/shared/Navbar";
import FloatingSidebar from "./components/FloatingSidebar";

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
        <div className="min-h-screenflex space-x-50 flex gap-20">
            {/* Sidebar */}
            <FloatingSidebar />
            {/* Wrapper to handle sidebar offset */}
            <div className="ml-70 flex-1">
                {/* Main content centered with max width */}
                <main className="px-6 max-w-7xl mx-auto ">{children}</main>
            </div>
        </div>
    );
}
