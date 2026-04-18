// app/api/tenant-invites/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { createAdminClient } from "@/lib/server/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { CreateTenantInviteInput } from "@/lib/shared/schemas/tenantInvites";

// ============================================================================
// POST /api/tenant-invites (Invite User)
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const adminClient = createAdminClient();
        const body = await request.json();

        const result = CreateTenantInviteInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { tenantId, fullName, invitedEmail, role } = result.data;

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

        // Verify user has manager or owner role in this tenant
        const { data: currentUserAccess } = await supabase
            .from("user_tenant_assignments")
            .select("role")
            .eq("user_id", user.id)
            .eq("tenant_id", tenantId)
            .single();

        if (
            !currentUserAccess ||
            !["owner", "manager"].includes(currentUserAccess.role)
        ) {
            return NextResponse.json(
                {
                    error: "Access denied - owner or manager role required to invite users",
                },
                { status: 403 },
            );
        }

        // Check if user already exists
        const { data: existingProfile } = await adminClient
            .from("profiles")
            .select("id")
            .eq("email", invitedEmail)
            .single();

        if (existingProfile) {
            // Check if they already have access to this tenant
            const { data: existingAssignment } = await adminClient
                .from("user_tenant_assignments")
                .select("id, role")
                .eq("user_id", existingProfile.id)
                .eq("tenant_id", tenantId)
                .single();

            if (existingAssignment) {
                return NextResponse.json(
                    { error: "User already has access to this tenant" },
                    { status: 409 },
                );
            }

            // User exists but not in this tenant - just add them
            const { error: assignmentError } = await adminClient
                .from("user_tenant_assignments")
                .insert({
                    user_id: existingProfile.id,
                    tenant_id: tenantId,
                    role: role,
                });

            if (assignmentError) {
                console.error("Assignment creation error:", assignmentError);
                return NextResponse.json(
                    { error: "Failed to add user to tenant" },
                    { status: 400 },
                );
            }

            // TODO: Send notification email that they've been added

            return NextResponse.json({
                success: true,
                message: "User added to tenant successfully",
                userId: existingProfile.id,
            });
        }

        // User doesn't exist - invite them via Supabase Auth
        const { data: inviteData, error: inviteError } =
            await adminClient.auth.admin.inviteUserByEmail(invitedEmail, {
                data: {
                    full_name: fullName,
                    // role: "user", // Default auth role
                },
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            });

        if (inviteError || !inviteData.user) {
            console.error("Supabase invite error:", inviteError);
            return NextResponse.json(
                { error: inviteError?.message || "Failed to invite user" },
                { status: 400 },
            );
        }

        const newUserId = inviteData.user.id;

        // Create profile for the new user with the full name
        const { error: profileError } = await adminClient
            .from("profiles")
            .insert({
                id: newUserId,
                email: invitedEmail,
                full_name: fullName,
                role: "USER",
            });

        if (profileError) {
            console.error("Profile creation error:", profileError);
            // Non-fatal - profile might already exist from auth trigger
        }

        // Create user_tenant_assignment
        const { error: assignmentError } = await adminClient
            .from("user_tenant_assignments")
            .insert({
                user_id: newUserId,
                tenant_id: tenantId,
                role: role,
            });

        if (assignmentError) {
            console.error("Assignment creation error:", assignmentError);
            return NextResponse.json(
                { error: "Failed to create tenant assignment" },
                { status: 400 },
            );
        }

        // Create tenant_invites record for tracking
        const { error: inviteRecordError } = await adminClient
            .from("tenant_invites")
            .insert({
                tenant_id: tenantId,
                invited_email: invitedEmail,
                created_by: user.id,
                expires_at: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000,
                ).toISOString(),
            });

        if (inviteRecordError) {
            console.error("Invite record error:", inviteRecordError);
            // Non-fatal - the invite was already sent
        }

        return NextResponse.json(
            {
                success: true,
                message: "Invitation sent successfully",
                userId: newUserId,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("POST /api/tenant-invites error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
