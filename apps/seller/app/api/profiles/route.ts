import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { ProfileResponse } from "@tea-pos/features/profiles/schema";

type ProfileRow = {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone_number: string | null;
    status: string;
    created_at: string | null;
    updated_at: string | null;
};

export async function GET() {
    try {
        const supabase = await createRouteHandlerClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single<ProfileRow>();

        if (profileError) {
            if (profileError.code === "PGRST116") {
                return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            }
            return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const profile = ProfileResponse.parse(toCamelKeys(data));
        return NextResponse.json(profile);
    } catch (error) {
        console.error("Profile API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
