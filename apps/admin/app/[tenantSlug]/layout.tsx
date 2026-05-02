// // app/[tenantSlug]/layout.tsx
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { notFound, redirect } from "next/navigation";

// export default async function TenantLayout({
//     children,
//     params,
// }: {
//     children: React.ReactNode;
//     params: Promise<{ tenantSlug: string }>;
// }) {
//     const { tenantSlug } = await params;
//     const supabase = await createRouteHandlerClient();

//     // 1. Verify tenant exists
//     const { data: tenant, error: tenantError } = await supabase
//         .from("tenants")
//         .select("id, name, slug")
//         .eq("slug", tenantSlug)
//         .single();

//     if (tenantError || !tenant) {
//         notFound(); // Show 404 if tenant doesn't exist
//     }

//     // 2. Check if user is authenticated
//     const {
//         data: { user },
//     } = await supabase.auth.getUser();

//     if (!user) {
//         // Redirect to login, preserve the intended destination
//         redirect(`/login?redirect=/${tenantSlug}/admin/dashboard`);
//     }

//     // 3. Check if user is a super admin (profiles.role = 'ADMIN')
//     const { data: profile } = await supabase
//         .from("profiles")
//         .select("role")
//         .eq("id", user.id)
//         .single();

//     const isSuperAdmin = profile?.role === "ADMIN";

//     // 4. If not super admin, verify user has access to this specific tenant
//     if (!isSuperAdmin) {
//         const { data: tenantAccess } = await supabase
//             .from("user_tenant_assignments")
//             .select("tenant_id, role")
//             .eq("user_id", user.id)
//             .eq("tenant_id", tenant.id)
//             .single();

//         if (!tenantAccess) {
//             // User doesn't have access to this tenant
//             return (
//                 <div className="flex items-center justify-center min-h-screen">
//                     <div className="text-center">
//                         <h1 className="text-2xl font-bold mb-4">
//                             Access Denied
//                         </h1>
//                         <p className="text-gray-600 mb-4">
//                             You don&apos;t have permission to access{" "}
//                             {tenant.name}.
//                         </p>
//                         <a
//                             href="/login"
//                             className="text-blue-600 hover:underline"
//                         >
//                             Return to login
//                         </a>
//                     </div>
//                 </div>
//             );
//         }
//     }

//     // 5. Cookie is already set by middleware, no need to set it here
//     // 6. Render children with tenant context
//     return <>{children}</>;
// }

// // app/[tenantSlug]/layout.tsx
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { notFound, redirect } from "next/navigation";

// export default async function TenantLayout({
//     children,
//     params,
// }: {
//     children: React.ReactNode;
//     params: Promise<{ tenantSlug: string }>;
// }) {
//     const { tenantSlug } = await params;
//     const supabase = await createRouteHandlerClient();

//     const { data: tenant, error: tenantError } = await supabase
//         .from("tenants")
//         .select("id, name, slug")
//         .eq("slug", tenantSlug)
//         .single();

//     if (tenantError || !tenant) {
//         notFound();
//     }

//     const {
//         data: { user },
//     } = await supabase.auth.getUser();

//     if (!user) {
//         redirect(`/login?redirect=/${tenantSlug}/admin/dashboard`);
//     }

//     // Fetch profile server-side
//     const { data: profile } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//     const isSuperAdmin = profile?.role === "ADMIN";

//     if (!isSuperAdmin) {
//         const { data: tenantAccess } = await supabase
//             .from("user_tenant_assignments")
//             .select("tenant_id, role")
//             .eq("user_id", user.id)
//             .eq("tenant_id", tenant.id)
//             .single();

//         if (!tenantAccess) {
//             return (
//                 <div className="flex items-center justify-center min-h-screen">
//                     <div className="text-center">
//                         <h1 className="text-2xl font-bold mb-4">
//                             Access Denied
//                         </h1>
//                         <p className="text-gray-600 mb-4">
//                             You don&apos;t have permission to access{" "}
//                             {tenant.name}.
//                         </p>
//                         <a
//                             href="/login"
//                             className="text-blue-600 hover:underline"
//                         >
//                             Return to login
//                         </a>
//                     </div>
//                 </div>
//             );
//         }
//     }

//     // Pass initial profile to AuthProvider
//     return <>{children}</>;
// }

import { createRouteHandlerClient } from "@/lib/supabase/server";
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
    const supabase = await createRouteHandlerClient();

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
                            Access Denied
                        </h1>
                        <p className="text-gray-600 mb-4">
                            You don&apos;t have permission to access{" "}
                            {tenant.name}.
                        </p>
                        {/* <a
                            href="/login"
                            className="text-blue-600 hover:underline"
                        >
                            Return to login
                        </a> */}
                        <Link href="/login/">Login</Link>
                    </div>
                </div>
            );
        }
    }

    // ✅ Wrap all tenant routes in TenantProvider
    return <TenantProvider initialTenant={tenant}>{children}</TenantProvider>;
}
