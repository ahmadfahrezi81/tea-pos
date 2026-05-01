// app/api/tenants/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateTenantInput,
    ListTenantsQuery,
    TenantListResponse,
    CreateTenantResponse,
} from "@/lib/shared/schemas/tenants";
import { toCamelKeys, toSnakeKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// GET /api/tenants
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);

        const queryResult = ListTenantsQuery.safeParse(
            Object.fromEntries(searchParams),
        );
        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 },
            );
        }

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Use userId from query or default to current user
        const userId = queryResult.data.userId || user.id;

        // Fetch tenants where user has access
        const query = supabase
            .from("tenants")
            .select(
                `
                *,
                user_tenant_assignments!inner(role)
            `,
            )
            .eq("user_tenant_assignments.user_id", userId)
            .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        const camelData = toCamelKeys(data || []);

        const parsed = TenantListResponse.safeParse({ tenants: camelData });
        if (!parsed.success) {
            console.error("Tenants response validation failed:", parsed.error);
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// POST /api/tenants
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const result = CreateTenantInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { name } = result.data;

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Insert tenant
        const tenantPayload = toSnakeKeys({ name });

        const { data: tenantData, error: tenantError } = await supabase
            .from("tenants")
            .insert(tenantPayload)
            .select()
            .single();

        if (tenantError || !tenantData) {
            return NextResponse.json(
                { error: tenantError?.message || "Tenant creation failed" },
                { status: 400 },
            );
        }

        // Assign creator as owner
        const assignmentPayload = toSnakeKeys({
            userId: user.id,
            tenantId: tenantData.id,
            role: "owner",
        });

        const { error: assignmentError } = await supabase
            .from("user_tenant_assignments")
            .insert(assignmentPayload);

        if (assignmentError) {
            // Rollback tenant creation if assignment fails
            await supabase.from("tenants").delete().eq("id", tenantData.id);
            return NextResponse.json(
                { error: "Failed to assign owner role" },
                { status: 400 },
            );
        }

        // Validate response
        const response = { success: true, tenantId: tenantData.id, name };
        const parsed = CreateTenantResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
