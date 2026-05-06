import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextResponse } from "next/server";
import { StoreListResponse } from "@tea-pos/features/stores/schema";
import { listUserStores } from "@tea-pos/services/stores";

export async function GET() {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await listUserStores(supabase, { tenantId, userId: user.id });
        const parsed = StoreListResponse.safeParse(data);
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
