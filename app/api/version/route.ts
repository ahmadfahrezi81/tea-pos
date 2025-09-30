import { NextResponse } from "next/server";
import { getBackendVersion } from "@/lib/version";

export async function GET() {
    return NextResponse.json({ backendVersion: getBackendVersion() });
}
