import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ProfileResponse } from "@tea-pos/features/profiles/schema";
import { getProfile } from "@tea-pos/services/profiles";

export async function GET() {
    try {
        const supabase = await createRouteHandlerClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await getProfile(supabase, { userId: user.id });
        return NextResponse.json(ProfileResponse.parse(data));
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
    }
}
