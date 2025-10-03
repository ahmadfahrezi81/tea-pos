// app/api/tenant-invites/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateTenantInviteInput,
    AcceptTenantInviteInput,
    ListTenantInvitesQuery,
    TenantInviteListResponse,
    CreateTenantInviteResponse,
    AcceptTenantInviteResponse,
} from "@/lib/schemas/tenantInvites";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";
import crypto from "crypto";

// ============================================================================
// GET /api/tenant-invites
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);

        const queryResult = ListTenantInvitesQuery.safeParse(
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

        // Fetch all invites for this tenant
        const query = supabase
            .from("tenant_invites")
            .select(
                `
                *,
                tenants(name),
                created_by_profile:profiles!tenant_invites_created_by_fkey(full_name, email),
                accepted_by_profile:profiles!tenant_invites_accepted_by_fkey(full_name, email)
            `
            )
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        const camelData = toCamelKeys(data || []);

        const parsed = TenantInviteListResponse.safeParse({
            invites: camelData,
        });
        if (!parsed.success) {
            console.error(
                "Tenant invites response validation failed:",
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
// POST /api/tenant-invites
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const result = CreateTenantInviteInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { tenantId, invitedEmail } = result.data;

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

        // Verify user has admin or owner role in this tenant
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
                    error: "Access denied - admin or owner role required to invite users",
                },
                { status: 403 }
            );
        }

        // Check if user with this email already has access
        const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", invitedEmail)
            .single();

        if (existingUser) {
            const { data: existingAssignment } = await supabase
                .from("user_tenant_assignments")
                .select("id")
                .eq("user_id", existingUser.id)
                .eq("tenant_id", tenantId)
                .single();

            if (existingAssignment) {
                return NextResponse.json(
                    { error: "User already has access to this tenant" },
                    { status: 409 }
                );
            }
        }

        // Check for existing pending invite
        const { data: existingInvite } = await supabase
            .from("tenant_invites")
            .select("id, expires_at")
            .eq("tenant_id", tenantId)
            .eq("invited_email", invitedEmail)
            .is("accepted_by", null)
            .single();

        if (existingInvite) {
            const now = new Date();
            if (existingInvite.expires_at) {
                const expiresAt = new Date(existingInvite.expires_at);
                if (expiresAt > now) {
                    return NextResponse.json(
                        {
                            error: "A pending invite already exists for this email",
                        },
                        { status: 409 }
                    );
                }
            }
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString("hex");

        // Calculate expiration (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invite
        const invitePayload = toSnakeKeys({
            tenantId,
            invitedEmail,
            token,
            createdBy: user.id,
            expiresAt: expiresAt.toISOString(),
        });

        const { data: inviteData, error: inviteError } = await supabase
            .from("tenant_invites")
            .insert(invitePayload)
            .select()
            .single();

        if (inviteError || !inviteData) {
            return NextResponse.json(
                { error: inviteError?.message || "Invite creation failed" },
                { status: 400 }
            );
        }

        // Validate response
        const response = {
            success: true,
            inviteId: inviteData.id,
            token,
            expiresAt: expiresAt.toISOString(),
        };
        const parsed = CreateTenantInviteResponse.safeParse(response);
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

// ============================================================================
// PATCH /api/tenant-invites
// ============================================================================
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const result = AcceptTenantInviteInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { token } = result.data;

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

        // Find invite by token
        const { data: invite, error: inviteError } = await supabase
            .from("tenant_invites")
            .select("*, tenants(name)")
            .eq("token", token)
            .is("accepted_by", null)
            .single();

        if (inviteError || !invite) {
            return NextResponse.json(
                { error: "Invalid or already accepted invite" },
                { status: 404 }
            );
        }

        // Check if invite has expired
        const now = new Date();
        if (!invite.expires_at) {
            return NextResponse.json(
                { error: "Invite expiration date is missing" },
                { status: 400 }
            );
        }
        const expiresAt = new Date(invite.expires_at);
        if (expiresAt < now) {
            return NextResponse.json(
                { error: "Invite has expired" },
                { status: 410 }
            );
        }

        // Check if user already has access
        const { data: existingAssignment } = await supabase
            .from("user_tenant_assignments")
            .select("id")
            .eq("user_id", user.id)
            .eq("tenant_id", invite.tenant_id)
            .single();

        if (existingAssignment) {
            return NextResponse.json(
                { error: "You already have access to this tenant" },
                { status: 409 }
            );
        }

        // Create user-tenant assignment with "member" role
        const assignmentPayload = toSnakeKeys({
            userId: user.id,
            tenantId: invite.tenant_id,
            role: "member",
        });

        const { error: assignmentError } = await supabase
            .from("user_tenant_assignments")
            .insert(assignmentPayload);

        if (assignmentError) {
            return NextResponse.json(
                { error: "Failed to create tenant assignment" },
                { status: 400 }
            );
        }

        // Mark invite as accepted
        const { error: updateError } = await supabase
            .from("tenant_invites")
            .update({ accepted_by: user.id })
            .eq("id", invite.id);

        if (updateError) {
            console.error("Failed to mark invite as accepted:", updateError);
        }

        // Validate response
        const response = {
            success: true,
            tenantId: invite.tenant_id,
            tenantName: invite.tenants?.name || "Unknown",
            role: "member",
        };
        const parsed = AcceptTenantInviteResponse.safeParse(response);
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
