// app/api/tenants/current/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextResponse } from "next/server";
import { toCamelKeys } from "@/lib/utils/schemas";

export async function GET() {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();

        if (!currentTenantId) {
            return NextResponse.json(
                { error: "No tenant context" },
                { status: 400 }
            );
        }

        // Get current user for auth check
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify user has access to this tenant
        const { data: userAccess } = await supabase
            .from("user_tenant_assignments")
            .select("role")
            .eq("user_id", user.id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (!userAccess) {
            return NextResponse.json(
                { error: "Access denied to this tenant" },
                { status: 403 }
            );
        }

        // Fetch tenant info
        const { data: tenant, error } = await supabase
            .from("tenants")
            .select("id, name, slug, created_at")
            .eq("id", currentTenantId)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const camelData = toCamelKeys(tenant);

        return NextResponse.json(camelData);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
