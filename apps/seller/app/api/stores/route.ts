import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextResponse } from "next/server";
import { StoreListResponse } from "@tea-pos/features/stores/schema";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function GET() {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch stores assigned to this user
        const { data: userAssignments, error: assignmentsError } = await supabase
            .from("user_store_assignments")
            .select("user_id, store_id, role, is_default")
            .eq("user_id", user.id);

        if (assignmentsError) {
            return NextResponse.json({ error: assignmentsError.message }, { status: 400 });
        }

        const storeIds = userAssignments?.map((a) => a.store_id) || [];

        const { data: stores, error: storesError } = await supabase
            .from("stores")
            .select("*")
            .eq("tenant_id", currentTenantId)
            .in("id", storeIds)
            .order("name");

        if (storesError) {
            return NextResponse.json({ error: storesError.message }, { status: 400 });
        }

        const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .order("full_name");

        if (usersError) {
            return NextResponse.json({ error: usersError.message }, { status: 400 });
        }

        const assignmentsByStore: Record<string, Array<{ user_id: string; role: string; is_default: boolean }>> = {};
        userAssignments?.forEach((a) => {
            if (!assignmentsByStore[a.store_id]) assignmentsByStore[a.store_id] = [];
            assignmentsByStore[a.store_id].push({ user_id: a.user_id, role: a.role, is_default: a.is_default });
        });

        const response = {
            stores: toCamelKeys(stores || []),
            users: toCamelKeys(usersData || []),
            assignments: toCamelKeys(assignmentsByStore),
        };

        const parsed = StoreListResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid response shape", details: parsed.error.format() },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Stores GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
