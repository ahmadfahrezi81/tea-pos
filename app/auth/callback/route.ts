import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (code) {
        const supabase = await createRouteHandlerClient();
        const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            const { data: tenantAssignments } = await supabase
                .from("user_tenant_assignments")
                .select("tenant_id, tenants(slug)")
                .eq("user_id", data.user.id);

            const tenantsData = tenantAssignments?.[0]?.tenants;
            const firstTenant = Array.isArray(tenantsData)
                ? tenantsData[0]
                : tenantsData;

            if (firstTenant?.slug) {
                const { data: storeAssignments } = await supabase
                    .from("user_store_assignments")
                    .select("role")
                    .eq("user_id", data.user.id);

                const hasSeller = storeAssignments?.some(
                    (a) => a.role === "seller",
                );
                const targetPath = hasSeller
                    ? `/${firstTenant.slug}/mobile/pos`
                    : `/${firstTenant.slug}/mobile/profile`;

                const redirectUrl = new URL(targetPath, origin);
                return NextResponse.redirect(redirectUrl);
            }
        }
    }

    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
