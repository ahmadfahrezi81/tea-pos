// app/api/stores/[storeId]/users/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
    ListStoreAssignmentsQuery,
    ListStoreAssignmentsResponse,
    StoreUserResponse,
} from "@/lib/schemas/userStoreAssignments";
import { toCamelKeys } from "@/lib/utils/schemas";

// ============================================================================
// GET /api/stores/[storeId]/users
// Lists all user assignments for a specific store
// ============================================================================
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ storeId: string }> }
) {
    const { storeId } = await context.params; // ✅ await it!

    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get("tenantId");

        // Validate query params
        const queryResult = ListStoreAssignmentsQuery.safeParse({
            storeId,
            tenantId: tenantId || undefined,
        });

        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { storeId: validatedStoreId, tenantId: validatedTenantId } =
            queryResult.data;

        // Build query
        const query = supabase
            .from("user_store_assignments")
            .select(
                `
        id,
        user_id,
        store_id,
        role,
        is_default,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `
            )
            .eq("store_id", validatedStoreId);

        if (validatedTenantId) {
            const { data: storeData, error: storeError } = await supabase
                .from("stores")
                .select("tenant_id")
                .eq("id", validatedStoreId)
                .single();

            if (storeError || !storeData) {
                return NextResponse.json(
                    { error: "Store not found" },
                    { status: 404 }
                );
            }

            if (storeData.tenant_id !== validatedTenantId) {
                return NextResponse.json(
                    { error: "Store does not belong to this tenant" },
                    { status: 403 }
                );
            }
        }

        const { data: assignmentsData, error: assignmentsError } =
            await query.order("created_at", { ascending: false });

        if (assignmentsError) {
            return NextResponse.json(
                { error: assignmentsError.message },
                { status: 400 }
            );
        }

        const camelAssignments = (assignmentsData || []).map((a) =>
            toCamelKeys(a)
        );

        const validatedAssignments = camelAssignments
            .map((a) => {
                const parsed = StoreUserResponse.safeParse(a);
                return parsed.success ? parsed.data : null;
            })
            .filter(Boolean);

        const response = { assignments: validatedAssignments };
        const parsed = ListStoreAssignmentsResponse.safeParse(response);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("[GET /api/stores/[storeId]/users]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
