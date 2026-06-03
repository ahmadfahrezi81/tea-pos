import { getSSRClient } from "@/lib/supabase/ssr";
import { NextResponse } from "next/server";

export async function POST() {
    const supabase = await getSSRClient();
    await supabase.auth.signOut();
    const response = NextResponse.json({ success: true });
    response.cookies.set("x-user-info", "", { path: "/", maxAge: 0 });
    response.cookies.set("x-tenant-id", "", { path: "/", maxAge: 0 });
    response.cookies.set("x-tenant-access", "", { path: "/", maxAge: 0 });
    return response;
}
