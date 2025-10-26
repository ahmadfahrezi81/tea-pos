// app/api/profiles/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { toCamelKeys } from "@/lib/utils/schemas";
import { ProfileResponse } from "@/lib/schemas/profiles";

// Type for the raw database response
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
        // 1. Create Supabase client
        const supabase = await createRouteHandlerClient();

        // 2. Get the authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
            console.error("Auth error:", userError);
            return NextResponse.json(
                { error: "Authentication failed" },
                { status: 401 }
            );
        }

        if (!user) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        // 3. Fetch the profile from the database
        const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single<ProfileRow>();

        if (profileError) {
            console.error("Profile fetch error:", profileError);

            // Handle specific Supabase errors
            if (profileError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Profile not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { error: "Failed to fetch profile" },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
        }

        // 4. Convert snake_case to camelCase
        const camelData = toCamelKeys(data);

        // 5. Validate with Zod schema
        const profile = ProfileResponse.parse(camelData);

        // 6. Return the validated profile
        return NextResponse.json(profile, { status: 200 });
    } catch (error) {
        console.error("Profile API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
