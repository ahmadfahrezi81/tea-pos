// app/api/users/[userId]/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { createAdminClient } from "@/lib/server/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
    UpdateUserInput,
    UpdateUserResponse,
} from "@/lib/shared/schemas/users";
import { toSnakeKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// PATCH /api/users/[userId] - Update user
// ============================================================================
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const supabase = await createRouteHandlerClient();
        const supabaseAdmin = createAdminClient();
        const body = await request.json();
        const { userId } = await params;

        // Validate input (without userId in body, it's in URL params)
        const result = UpdateUserInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { fullName, role } = result.data;

        // Get current user (admin updating the user)
        const {
            data: { user: currentUser },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Get current user's tenant
        const { data: currentUserTenant } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, role")
            .eq("user_id", currentUser.id)
            .single();

        if (!currentUserTenant) {
            return NextResponse.json(
                { error: "You don't belong to any tenant" },
                { status: 403 },
            );
        }

        // Check if current user has permission (owner or manager can update users)
        if (!["owner", "manager"].includes(currentUserTenant.role)) {
            return NextResponse.json(
                {
                    error: "Access denied - only owners and managers can update users",
                },
                { status: 403 },
            );
        }

        // Check if target user exists in the same tenant
        const { data: targetUserAssignment } = await supabase
            .from("user_tenant_assignments")
            .select("id, role")
            .eq("user_id", userId)
            .eq("tenant_id", currentUserTenant.tenant_id)
            .single();

        if (!targetUserAssignment) {
            return NextResponse.json(
                { error: "User not found in your tenant" },
                { status: 404 },
            );
        }

        // // Update profile if fullName provided
        // if (fullName) {
        //     const profilePayload = toSnakeKeys({ fullName });
        //     const { error: profileError } = await supabaseAdmin
        //         .from("profiles")
        //         .update(profilePayload)
        //         .eq("id", userId);

        //     if (profileError) {
        //         console.error("Profile update error:", profileError);
        //         return NextResponse.json(
        //             { error: "Failed to update user profile" },
        //             { status: 400 }
        //         );
        //     }
        // }

        // Update profile fields if provided
        const profilePayload = toSnakeKeys({
            fullName,
            phoneNumber: result.data.phoneNumber,
            status: result.data.status,
        });

        // Only update if something exists to update
        if (Object.values(profilePayload).some((v) => v !== undefined)) {
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .update(profilePayload)
                .eq("id", userId);

            if (profileError) {
                console.error("Profile update error:", profileError);
                return NextResponse.json(
                    { error: "Failed to update user profile" },
                    { status: 400 },
                );
            }
        }

        // Update tenant role if role provided
        if (role) {
            const assignmentPayload = toSnakeKeys({ role });
            const { error: assignmentError } = await supabaseAdmin
                .from("user_tenant_assignments")
                .update(assignmentPayload)
                .eq("user_id", userId)
                .eq("tenant_id", currentUserTenant.tenant_id);

            if (assignmentError) {
                console.error("Assignment update error:", assignmentError);
                return NextResponse.json(
                    { error: "Failed to update user role" },
                    { status: 400 },
                );
            }
        }

        // Validate response
        const response = {
            success: true,
            userId,
            message: "User updated successfully",
        };

        const parsed = UpdateUserResponse.safeParse(response);
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
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// DELETE /api/users/[userId] - Delete user (optional for future)
// ============================================================================
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const supabase = await createRouteHandlerClient();
        const supabaseAdmin = createAdminClient();
        const { userId } = await params;

        // Get current user
        const {
            data: { user: currentUser },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Get current user's tenant
        const { data: currentUserTenant } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, role")
            .eq("user_id", currentUser.id)
            .single();

        if (!currentUserTenant) {
            return NextResponse.json(
                { error: "You don't belong to any tenant" },
                { status: 403 },
            );
        }

        // Check if current user has permission (only owners can delete users)
        if (currentUserTenant.role !== "owner") {
            return NextResponse.json(
                {
                    error: "Access denied - only owners can delete users",
                },
                { status: 403 },
            );
        }

        // Can't delete yourself
        if (userId === currentUser.id) {
            return NextResponse.json(
                { error: "You cannot delete yourself" },
                { status: 400 },
            );
        }

        // Remove from tenant (cascading will handle profile deletion if configured)
        const { error: deleteError } = await supabaseAdmin
            .from("user_tenant_assignments")
            .delete()
            .eq("user_id", userId)
            .eq("tenant_id", currentUserTenant.tenant_id);

        if (deleteError) {
            console.error("Delete error:", deleteError);
            return NextResponse.json(
                { error: "Failed to remove user" },
                { status: 400 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "User removed successfully",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
