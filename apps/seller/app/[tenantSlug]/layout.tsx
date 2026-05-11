import { getSSRClient } from "@/lib/supabase/ssr";
import { notFound, redirect } from "next/navigation";
import { TenantProvider } from "./TenantProvider";
import Link from "next/link";

export default async function TenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }>;
}) {
    const { tenantSlug } = await params;
    const supabase = await getSSRClient();

    // Fetch tenant info
    const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .eq("slug", tenantSlug)
        .single();

    if (tenantError || !tenant) {
        notFound();
    }

    // Ensure user is authenticated
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?redirect=/${tenantSlug}/admin/dashboard`);
    }

    // Fetch profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const isSuperAdmin = profile?.role === "ADMIN";

    if (!isSuperAdmin) {
        const { data: tenantAccess } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, role")
            .eq("user_id", user.id)
            .eq("tenant_id", tenant.id)
            .single();

        if (!tenantAccess) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">
                            l Access Denied
                        </h1>
                        <p className="text-gray-600 mb-4">
                            You don&apos;t have permission to access{" "}
                            {tenant.name}.
                        </p>
                        <Link href="/login/">Login</Link>
                    </div>
                </div>
            );
        }
    }

    return <TenantProvider initialTenant={tenant}>{children}</TenantProvider>;
}
