// app/api/users/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { CreateUserInput, CreateUserResponse } from "@/lib/schemas/users";
import { toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// POST /api/users - Create new user
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const supabaseAdmin = createAdminClient();
        const body = await request.json();

        // Validate input
        const result = CreateUserInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { fullName, email, role, password } = result.data;

        // Get current user (admin creating the new user)
        const {
            data: { user: currentUser },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
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
                { status: 403 }
            );
        }

        // Check if current user has permission (owner or manager can create users)
        if (!["owner", "manager"].includes(currentUserTenant.role)) {
            return NextResponse.json(
                {
                    error: "Access denied - only owners and managers can create users",
                },
                { status: 403 }
            );
        }

        // Check if email already exists
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        if (existingProfile) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 409 }
            );
        }

        // Create user in Supabase Auth using Admin API
        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    full_name: fullName,
                },
            });

        if (authError || !authData.user) {
            console.error("Auth error:", authError);
            return NextResponse.json(
                { error: authError?.message || "Failed to create user" },
                { status: 400 }
            );
        }

        const newUserId = authData.user.id;

        // Create profile using admin client to bypass RLS
        const profilePayload = toSnakeKeys({
            id: newUserId,
            email,
            fullName,
            role: "USER", // ✅ platform-level role
        });

        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert(profilePayload);

        if (profileError) {
            console.error("Profile creation error:", profileError);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json(
                { error: "Failed to create user profile" },
                { status: 400 }
            );
        }

        // Assign user to tenant using admin client to bypass RLS
        const assignmentPayload = toSnakeKeys({
            userId: newUserId,
            tenantId: currentUserTenant.tenant_id,
            role: role || "staff", // ✅ default to staff
        });

        const { error: assignmentError } = await supabaseAdmin
            .from("user_tenant_assignments")
            .insert(assignmentPayload);

        if (assignmentError) {
            console.error("Assignment error:", assignmentError);
            await supabaseAdmin.from("profiles").delete().eq("id", newUserId);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json(
                { error: "Failed to assign user to tenant" },
                { status: 400 }
            );
        }

        // Validate response
        const response = {
            success: true,
            userId: newUserId,
            email,
            message: "User created successfully",
        };

        const parsed = CreateUserResponse.safeParse(response);
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
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
