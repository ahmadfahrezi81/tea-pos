//app/api/version/route.ts

// import { NextResponse } from "next/server";
// import { getBackendVersion } from "@/lib/version";

// export async function GET() {
//     return NextResponse.json({ backendVersion: getBackendVersion() });
// }

import { NextResponse } from "next/server";
import { getBackendVersion } from "@/lib/shared/version";
import packageJson from "@/package.json";

export async function GET() {
    return NextResponse.json({
        frontendVersion:
            process.env.NEXT_PUBLIC_APP_VERSION ||
            packageJson.version ||
            "1.0.0",
        backendVersion: getBackendVersion(),
    });
}
