//app/api/store/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
// import { cookies } from "next/headers"; // required for auth

// // GET - Fetch all stores with assignments
// export async function GET() {
//     try {
//         const supabase = await createRouteHandlerClient();

//         // Load stores
//         const { data: storesData, error: storesError } = await supabase
//             .from("stores")
//             .select("*")
//             .order("name");

//         if (storesError) throw storesError;

//         // Load all users (ignoring profiles.role)
//         const { data: usersData, error: usersError } = await supabase
//             .from("profiles")
//             .select("id, full_name, email")
//             .order("full_name");

//         if (usersError) throw usersError;

//         // Load store assignments with roles
//         const { data: assignmentsData, error: assignmentsError } =
//             await supabase
//                 .from("user_store_assignments")
//                 .select("user_id, store_id, role, is_default");

//         if (assignmentsError) throw assignmentsError;

//         // Group assignments by store with role information
//         const assignmentsByStore: Record<
//             string,
//             Array<{
//                 user_id: string;
//                 role: string;
//                 is_default: boolean;
//             }>
//         > = {};

//         assignmentsData?.forEach((assignment) => {
//             if (!assignmentsByStore[assignment.store_id]) {
//                 assignmentsByStore[assignment.store_id] = [];
//             }
//             assignmentsByStore[assignment.store_id].push({
//                 user_id: assignment.user_id,
//                 role: assignment.role,
//                 is_default: assignment.is_default,
//             });
//         });

//         return NextResponse.json({
//             stores: storesData || [],
//             users: usersData || [],
//             assignments: assignmentsByStore,
//         });
//     } catch (error) {
//         console.error("Error fetching stores data:", error);
//         return NextResponse.json(
//             { error: "Failed to fetch stores data" },
//             { status: 500 }
//         );
//     }
// }

// GET - Fetch all stores with assignments or filter by specific user_id
export async function GET(req: Request) {
    try {
        const supabase = await createRouteHandlerClient();

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("user_id");

        let storesData;
        let storesError;

        let assignmentsData;
        let assignmentsError;

        if (userId) {
            // Fetch only the user's store assignments
            const { data: userAssignments, error: userAssignmentsError } =
                await supabase
                    .from("user_store_assignments")
                    .select("user_id, store_id, role, is_default")
                    .eq("user_id", userId);

            if (userAssignmentsError) throw userAssignmentsError;

            const storeIds = userAssignments.map((a) => a.store_id);

            // Fetch only relevant stores
            const storesResponse = await supabase
                .from("stores")
                .select("*")
                .in("id", storeIds)
                .order("name");

            storesData = storesResponse.data;
            storesError = storesResponse.error;

            if (storesError) throw storesError;

            assignmentsData = userAssignments;
        } else {
            // Load all stores
            const storesResponse = await supabase
                .from("stores")
                .select("*")
                .order("name");

            storesData = storesResponse.data;
            storesError = storesResponse.error;

            if (storesError) throw storesError;

            // Load all assignments
            const assignmentsResponse = await supabase
                .from("user_store_assignments")
                .select("user_id, store_id, role, is_default");

            assignmentsData = assignmentsResponse.data;
            assignmentsError = assignmentsResponse.error;

            if (assignmentsError) throw assignmentsError;
        }

        // Load all users (or only the specific user if filtering)
        let usersData;
        let usersError;

        if (userId) {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .eq("id", userId);
            usersData = data;
            usersError = error;
        } else {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .order("full_name");
            usersData = data;
            usersError = error;
        }

        if (usersError) throw usersError;

        // Group assignments by store with role information
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

        return NextResponse.json({
            stores: storesData || [],
            users: usersData || [],
            assignments: assignmentsByStore,
        });
    } catch (error) {
        console.error("Error fetching stores data:", error);
        return NextResponse.json(
            { error: "Failed to fetch stores data" },
            { status: 500 }
        );
    }
}

// POST - Create new store
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();
        const { name, address } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Store name is required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("stores")
            .insert({
                name: name.trim(),
                address: address?.trim() || null,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error("Error creating store:", error);
        return NextResponse.json(
            { error: "Failed to create store" },
            { status: 500 }
        );
    }
}

// PUT - Update existing store
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();
        const { id, name, address } = body;

        if (!id || !name) {
            return NextResponse.json(
                { error: "Store ID and name are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("stores")
            .update({
                name: name.trim(),
                address: address?.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error updating store:", error);
        return NextResponse.json(
            { error: "Failed to update store" },
            { status: 500 }
        );
    }
}

// DELETE - Delete store
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Store ID is required" },
                { status: 400 }
            );
        }

        // Delete all assignments first (cascade should handle this, but being explicit)
        await supabase
            .from("user_store_assignments")
            .delete()
            .eq("store_id", id);

        // Delete the store
        const { error } = await supabase.from("stores").delete().eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting store:", error);
        return NextResponse.json(
            { error: "Failed to delete store" },
            { status: 500 }
        );
    }
}
