import { getSSRClient } from "@/lib/supabase/ssr";
import { getServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (code) {
        const supabase = await getSSRClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            const { data: profile } = await supabase
                .from("users")
                .select("role")
                .eq("id", data.user.id)
                .single();

            if (profile?.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/unauthorized?reason=no-access", origin));
            }

            const avatarUrl = (data.user.user_metadata?.avatar_url as string | undefined) ?? null;
            if (avatarUrl) {
                const { error: syncError } = await getServiceClient()
                    .from("users")
                    .update({ avatar_url: avatarUrl })
                    .eq("id", data.user.id);
                if (syncError) console.error("[auth/callback] avatar_url sync failed:", syncError);
            }

            const { data: tenantAssignments } = await supabase
                .from("user_tenant_assignments")
                .select("tenant_id, tenants(slug)")
                .eq("user_id", data.user.id);

            const tenantsData = tenantAssignments?.[0]?.tenants;
            const firstTenant = Array.isArray(tenantsData) ? tenantsData[0] : tenantsData;

            if (firstTenant?.slug) {
                return NextResponse.redirect(new URL(`/${firstTenant.slug}/mobile/home`, origin));
            }
        }
    }

    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
