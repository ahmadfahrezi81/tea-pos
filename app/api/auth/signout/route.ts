// app/api/auth/signout/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createRouteHandlerClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Signout error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const response = NextResponse.json({ success: true }, { status: 200 });

        // Clear custom cookies server-side
        response.cookies.set("x-user-info", "", { path: "/", maxAge: 0 });
        response.cookies.set("x-tenant-id", "", { path: "/", maxAge: 0 });

        return response;
    } catch (error) {
        console.error("Signout error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
