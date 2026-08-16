import packageJson from "@/package.json";
import { ok } from "@/lib/api/response";

/**
 * Deliberately unauthenticated and free of any I/O: the client polls this on
 * every foreground to find out whether its JavaScript predates the deployment
 * now serving, and a check that costs a database round trip would be worse than
 * the staleness it detects.
 *
 * `buildId` is the answer to that question. It is inlined at build time from
 * the commit sha, so this handler — code belonging to the *new* deployment —
 * returns a different string than the bundle an old tab is still running.
 * `frontendVersion` and `backendVersion` are the hand-bumped release number,
 * kept because the Account screen badge reads them.
 */
export async function GET() {
    return ok({
        buildId: process.env.NEXT_PUBLIC_BUILD_ID || packageJson.version,
        frontendVersion: process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version,
        backendVersion: packageJson.version,
    });
}
