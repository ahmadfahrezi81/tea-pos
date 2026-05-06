import { NextResponse } from "next/server";
import packageJson from "@/package.json";

export async function GET() {
    return NextResponse.json({
        frontendVersion:
            process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || "1.0.0",
        backendVersion: packageJson.version || "1.0.0",
    });
}
