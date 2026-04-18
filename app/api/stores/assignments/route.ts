// //app/api/store/assignments/route.ts

// import { createRouteHandlerClient } from "@/lib/server/supabase/server";
// import { NextRequest, NextResponse } from "next/server";

// // POST - Create or update assignment
// export async function POST(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const body = await request.json();
//         const { user_id, store_id, role, is_default = false } = body;

//         if (!user_id || !store_id || !role) {
//             return NextResponse.json(
//                 { error: "user_id, store_id, and role are required" },
//                 { status: 400 }
//             );
//         }

//         if (!["seller", "manager"].includes(role)) {
//             return NextResponse.json(
//                 { error: "Role must be 'seller' or 'manager'" },
//                 { status: 400 }
//             );
//         }

//         // Check if assignment already exists
//         const { data: existingAssignment } = await supabase
//             .from("user_store_assignments")
//             .select("*")
//             .eq("user_id", user_id)
//             .eq("store_id", store_id)
//             .eq("role", role)
//             .single();

//         if (existingAssignment) {
//             return NextResponse.json(
//                 { error: "Assignment already exists" },
//                 { status: 409 }
//             );
//         }

//         // If setting as default, unset other defaults for this user
//         if (is_default) {
//             await supabase
//                 .from("user_store_assignments")
//                 .update({ is_default: false })
//                 .eq("user_id", user_id);
//         }

//         const { data, error } = await supabase
//             .from("user_store_assignments")
//             .insert({
//                 user_id,
//                 store_id,
//                 role,
//                 is_default,
//             })
//             .select()
//             .single();

//         if (error) throw error;

//         return NextResponse.json(data, { status: 201 });
//     } catch (error) {
//         console.error("Error creating assignment:", error);
//         return NextResponse.json(
//             { error: "Failed to create assignment" },
//             { status: 500 }
//         );
//     }
// }

// // PUT - Update assignment (mainly for is_default)
// export async function PUT(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const body = await request.json();
//         const { user_id, store_id, role, is_default } = body;

//         if (!user_id || !store_id || !role) {
//             return NextResponse.json(
//                 { error: "user_id, store_id, and role are required" },
//                 { status: 400 }
//             );
//         }

//         // If setting as default, unset other defaults for this user
//         if (is_default) {
//             await supabase
//                 .from("user_store_assignments")
//                 .update({ is_default: false })
//                 .eq("user_id", user_id);
//         }

//         const { data, error } = await supabase
//             .from("user_store_assignments")
//             .update({ is_default })
//             .eq("user_id", user_id)
//             .eq("store_id", store_id)
//             .eq("role", role)
//             .select()
//             .single();

//         if (error) throw error;

//         return NextResponse.json(data);
//     } catch (error) {
//         console.error("Error updating assignment:", error);
//         return NextResponse.json(
//             { error: "Failed to update assignment" },
//             { status: 500 }
//         );
//     }
// }

// // DELETE - Remove assignment
// export async function DELETE(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);
//         const user_id = searchParams.get("user_id");
//         const store_id = searchParams.get("store_id");
//         const role = searchParams.get("role");

//         if (!user_id || !store_id || !role) {
//             return NextResponse.json(
//                 { error: "user_id, store_id, and role are required" },
//                 { status: 400 }
//             );
//         }

//         const { error } = await supabase
//             .from("user_store_assignments")
//             .delete()
//             .eq("user_id", user_id)
//             .eq("store_id", store_id)
//             .eq("role", role);

//         if (error) throw error;

//         return NextResponse.json({ success: true });
//     } catch (error) {
//         console.error("Error deleting assignment:", error);
//         return NextResponse.json(
//             { error: "Failed to delete assignment" },
//             { status: 500 }
//         );
//     }
// }

// app/api/stores/assignments/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateAssignmentInput,
    UpdateAssignmentInput,
    DeleteAssignmentQuery,
    CreateAssignmentResponse,
    UpdateAssignmentResponse,
    DeleteAssignmentResponse,
} from "@/lib/shared/schemas/userStoreAssignments";
import { toCamelKeys, toSnakeKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// POST /api/stores/assignments
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const result = CreateAssignmentInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { userId, storeId, role, isDefault = false } = result.data;

        // Check if assignment already exists
        const { data: existingAssignment } = await supabase
            .from("user_store_assignments")
            .select("*")
            .eq("user_id", userId)
            .eq("store_id", storeId)
            .eq("role", role)
            .single();

        if (existingAssignment) {
            return NextResponse.json(
                { error: "Assignment already exists" },
                { status: 409 },
            );
        }

        // If setting as default, unset other defaults for this user
        if (isDefault) {
            await supabase
                .from("user_store_assignments")
                .update({ is_default: false })
                .eq("user_id", userId);
        }

        // Insert assignment
        const assignmentPayload = toSnakeKeys({
            userId,
            storeId,
            role,
            isDefault,
        });

        const { data: assignmentData, error: assignmentError } = await supabase
            .from("user_store_assignments")
            .insert(assignmentPayload)
            .select()
            .single();

        if (assignmentError || !assignmentData) {
            return NextResponse.json(
                {
                    error:
                        assignmentError?.message || "Assignment insert failed",
                },
                { status: 400 },
            );
        }

        // Validate response
        const camelAssignment = toCamelKeys(assignmentData);
        const parsed = CreateAssignmentResponse.safeParse(camelAssignment);
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
// PUT /api/stores/assignments
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const result = UpdateAssignmentInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { userId, storeId, role, isDefault } = result.data;

        // If setting as default, unset other defaults for this user
        if (isDefault) {
            await supabase
                .from("user_store_assignments")
                .update({ is_default: false })
                .eq("user_id", userId);
        }

        const { data: assignmentData, error: assignmentError } = await supabase
            .from("user_store_assignments")
            .update({ is_default: isDefault })
            .eq("user_id", userId)
            .eq("store_id", storeId)
            .eq("role", role)
            .select()
            .single();

        if (assignmentError || !assignmentData) {
            return NextResponse.json(
                { error: assignmentError?.message || "Assignment not found" },
                { status: 404 },
            );
        }

        // Validate response
        const camelAssignment = toCamelKeys(assignmentData);
        const parsed = UpdateAssignmentResponse.safeParse(camelAssignment);
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
// DELETE /api/stores/assignments
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);

        const queryResult = DeleteAssignmentQuery.safeParse(
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

        const { userId, storeId, role } = queryResult.data;

        const { error: deleteError } = await supabase
            .from("user_store_assignments")
            .delete()
            .eq("user_id", userId)
            .eq("store_id", storeId)
            .eq("role", role);

        if (deleteError) {
            return NextResponse.json(
                { error: deleteError.message },
                { status: 400 },
            );
        }

        // Validate response
        const response = { success: true };
        const parsed = DeleteAssignmentResponse.safeParse(response);
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
