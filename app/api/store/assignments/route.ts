import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Create or update assignment
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();
        const { user_id, store_id, role, is_default = false } = body;

        if (!user_id || !store_id || !role) {
            return NextResponse.json(
                { error: "user_id, store_id, and role are required" },
                { status: 400 }
            );
        }

        if (!["seller", "manager"].includes(role)) {
            return NextResponse.json(
                { error: "Role must be 'seller' or 'manager'" },
                { status: 400 }
            );
        }

        // Check if assignment already exists
        const { data: existingAssignment } = await supabase
            .from("user_store_assignments")
            .select("*")
            .eq("user_id", user_id)
            .eq("store_id", store_id)
            .eq("role", role)
            .single();

        if (existingAssignment) {
            return NextResponse.json(
                { error: "Assignment already exists" },
                { status: 409 }
            );
        }

        // If setting as default, unset other defaults for this user
        if (is_default) {
            await supabase
                .from("user_store_assignments")
                .update({ is_default: false })
                .eq("user_id", user_id);
        }

        const { data, error } = await supabase
            .from("user_store_assignments")
            .insert({
                user_id,
                store_id,
                role,
                is_default,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error("Error creating assignment:", error);
        return NextResponse.json(
            { error: "Failed to create assignment" },
            { status: 500 }
        );
    }
}

// PUT - Update assignment (mainly for is_default)
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();
        const { user_id, store_id, role, is_default } = body;

        if (!user_id || !store_id || !role) {
            return NextResponse.json(
                { error: "user_id, store_id, and role are required" },
                { status: 400 }
            );
        }

        // If setting as default, unset other defaults for this user
        if (is_default) {
            await supabase
                .from("user_store_assignments")
                .update({ is_default: false })
                .eq("user_id", user_id);
        }

        const { data, error } = await supabase
            .from("user_store_assignments")
            .update({ is_default })
            .eq("user_id", user_id)
            .eq("store_id", store_id)
            .eq("role", role)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error updating assignment:", error);
        return NextResponse.json(
            { error: "Failed to update assignment" },
            { status: 500 }
        );
    }
}

// DELETE - Remove assignment
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get("user_id");
        const store_id = searchParams.get("store_id");
        const role = searchParams.get("role");

        if (!user_id || !store_id || !role) {
            return NextResponse.json(
                { error: "user_id, store_id, and role are required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("user_store_assignments")
            .delete()
            .eq("user_id", user_id)
            .eq("store_id", store_id)
            .eq("role", role);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        return NextResponse.json(
            { error: "Failed to delete assignment" },
            { status: 500 }
        );
    }
}
