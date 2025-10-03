// app/api/user-tenant-assignments/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
    AssignUserToTenantInput,
    ListUserTenantAssignmentsQuery,
    UserTenantAssignmentListResponse,
    AssignUserToTenantResponse,
} from "@/lib/schemas/userTenantAssignments";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// GET /api/user-tenant-assignments
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);

        const queryResult = ListUserTenantAssignmentsQuery.safeParse(
            Object.fromEntries(searchParams)
        );
        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { tenantId } = queryResult.data;

        // Get current user
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
            .eq("tenant_id", tenantId)
            .single();

        if (!userAccess) {
            return NextResponse.json(
                { error: "Access denied - you don't belong to this tenant" },
                { status: 403 }
            );
        }

        // Fetch all assignments for this tenant
        const query = supabase
            .from("user_tenant_assignments")
            .select(
                `
                *,
                profiles(full_name, email)
            `
            )
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        const camelData = toCamelKeys(data || []);

        const parsed = UserTenantAssignmentListResponse.safeParse({
            assignments: camelData,
        });
        if (!parsed.success) {
            console.error(
                "User tenant assignments response validation failed:",
                parsed.error
            );
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST /api/user-tenant-assignments
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const result = AssignUserToTenantInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { userId, tenantId, role } = result.data;

        // Get current user
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

        // Verify current user has admin or owner role in this tenant
        const { data: currentUserAccess } = await supabase
            .from("user_tenant_assignments")
            .select("role")
            .eq("user_id", user.id)
            .eq("tenant_id", tenantId)
            .single();

        if (
            !currentUserAccess ||
            !["owner", "admin"].includes(currentUserAccess.role)
        ) {
            return NextResponse.json(
                {
                    error: "Access denied - admin or owner role required to assign users",
                },
                { status: 403 }
            );
        }

        // Check if user exists
        const { data: targetUser, error: targetUserError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .single();

        if (targetUserError || !targetUser) {
            return NextResponse.json(
                { error: "Target user not found" },
                { status: 404 }
            );
        }

        // Check if assignment already exists
        const { data: existingAssignment } = await supabase
            .from("user_tenant_assignments")
            .select("id")
            .eq("user_id", userId)
            .eq("tenant_id", tenantId)
            .single();

        if (existingAssignment) {
            return NextResponse.json(
                { error: "User is already assigned to this tenant" },
                { status: 409 }
            );
        }

        // Create assignment
        const assignmentPayload = toSnakeKeys({
            userId,
            tenantId,
            role,
        });

        const { data: assignmentData, error: assignmentError } = await supabase
            .from("user_tenant_assignments")
            .insert(assignmentPayload)
            .select()
            .single();

        if (assignmentError || !assignmentData) {
            return NextResponse.json(
                {
                    error:
                        assignmentError?.message ||
                        "Assignment creation failed",
                },
                { status: 400 }
            );
        }

        // Validate response
        const response = {
            success: true,
            assignmentId: assignmentData.id,
            userId,
            tenantId,
            role,
        };
        const parsed = AssignUserToTenantResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
