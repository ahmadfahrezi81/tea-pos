// app/api/stores/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateStoreInput,
    UpdateStoreInput,
    StoreListResponse,
    CreateStoreResponse,
    UpdateStoreResponse,
    DeleteStoreResponse,
} from "@/lib/shared/schemas/stores";
import { toCamelKeys, toSnakeKeys } from "@/lib/shared/utils/schemas";
import { checkIsAdmin } from "@/lib/server/supabase/checkIsAdmin";

// ============================================================================
// GET /api/stores
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const isAdmin = await checkIsAdmin(supabase);

        let storesData;
        let assignmentsData;

        if (isAdmin) {
            const { data: stores, error: storesError } = await supabase
                .from("stores")
                .select("*")
                .eq("tenant_id", currentTenantId)
                .order("name");

            if (storesError) {
                return NextResponse.json(
                    { error: storesError.message },
                    { status: 400 },
                );
            }

            const { data: assignments, error: assignmentsError } =
                await supabase
                    .from("user_store_assignments")
                    .select("user_id, store_id, role, is_default");

            if (assignmentsError) {
                return NextResponse.json(
                    { error: assignmentsError.message },
                    { status: 400 },
                );
            }

            storesData = stores;
            assignmentsData = assignments;
        } else {
            const { data: userAssignments, error: userAssignmentsError } =
                await supabase
                    .from("user_store_assignments")
                    .select("user_id, store_id, role, is_default")
                    .eq("user_id", user.id);

            if (userAssignmentsError) {
                return NextResponse.json(
                    { error: userAssignmentsError.message },
                    { status: 400 },
                );
            }

            const storeIds = userAssignments?.map((a) => a.store_id) || [];

            const { data: stores, error: storesError } = await supabase
                .from("stores")
                .select("*")
                .eq("tenant_id", currentTenantId)
                .in("id", storeIds)
                .order("name");

            if (storesError) {
                return NextResponse.json(
                    { error: storesError.message },
                    { status: 400 },
                );
            }

            storesData = stores;
            assignmentsData = userAssignments;
        }

        const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .order("full_name");

        if (usersError) {
            return NextResponse.json(
                { error: usersError.message },
                { status: 400 },
            );
        }

        const assignmentsByStore: Record<
            string,
            Array<{
                user_id: string;
                role: string;
                is_default: boolean;
            }>
        > = {};

        assignmentsData?.forEach((assignment) => {
            if (!assignmentsByStore[assignment.store_id]) {
                assignmentsByStore[assignment.store_id] = [];
            }
            assignmentsByStore[assignment.store_id].push({
                user_id: assignment.user_id,
                role: assignment.role,
                is_default: assignment.is_default,
            });
        });

        const camelStores = toCamelKeys(storesData || []);
        const camelUsers = toCamelKeys(usersData || []);
        const camelAssignments = toCamelKeys(assignmentsByStore);

        const response = {
            stores: camelStores,
            users: camelUsers,
            assignments: camelAssignments,
        };

        const parsed = StoreListResponse.safeParse(response);
        if (!parsed.success) {
            console.error("Stores response validation failed:", parsed.error);
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
// POST /api/stores
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateStoreInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { name, address, latitude, longitude, status } = result.data;

        const storePayload = toSnakeKeys({
            name: name.trim(),
            address: address?.trim() || null,
            latitude,
            longitude,
            status,
            tenantId: currentTenantId,
        });

        const { data: storeData, error: storeError } = await supabase
            .from("stores")
            .insert(storePayload)
            .select()
            .single();

        if (storeError || !storeData) {
            return NextResponse.json(
                { error: storeError?.message || "Store insert failed" },
                { status: 400 },
            );
        }

        const camelStore = toCamelKeys(storeData);
        const parsed = CreateStoreResponse.safeParse(camelStore);
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

// ============================================================================
// PUT /api/stores
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = UpdateStoreInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { id, name, address, status } = result.data;

        const updates = {
            name: name.trim(),
            address: address?.trim() || null,
            status,
            updated_at: new Date().toISOString(),
        };

        const { data: storeData, error: storeError } = await supabase
            .from("stores")
            .update(updates)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (storeError || !storeData) {
            return NextResponse.json(
                { error: storeError?.message || "Store not found" },
                { status: 404 },
            );
        }

        const camelStore = toCamelKeys(storeData);
        const parsed = UpdateStoreResponse.safeParse(camelStore);
        if (!parsed.success) {
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
// DELETE /api/stores
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Store ID is required" },
                { status: 400 },
            );
        }

        await supabase
            .from("user_store_assignments")
            .delete()
            .eq("store_id", id);

        const { error: storeError } = await supabase
            .from("stores")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId);

        if (storeError) {
            if (
                storeError.message.includes("violates foreign key constraint")
            ) {
                return NextResponse.json(
                    {
                        error: "Cannot delete store because it has related data (e.g. daily summaries). Remove those first or archive the store.",
                    },
                    { status: 400 },
                );
            }

            return NextResponse.json(
                { error: storeError.message },
                { status: 400 },
            );
        }

        const response = { success: true };
        const parsed = DeleteStoreResponse.safeParse(response);
        if (!parsed.success) {
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
