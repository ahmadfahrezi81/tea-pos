// app/api/auth/signout/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createRouteHandlerClient();

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Signout error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { success: true, message: "Signed out successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Signout error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
