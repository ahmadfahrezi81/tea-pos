import packageJson from "@/package.json";
import { ok } from "@/lib/api/response";

export async function GET() {
    return ok({
        frontendVersion: process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || "1.0.0",
        backendVersion: packageJson.version || "1.0.0",
    });
}
