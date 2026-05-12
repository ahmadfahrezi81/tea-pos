import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { ProfileResponse } from "@tea-pos/features/profiles/schema";
import { getProfile } from "@tea-pos/services/profiles";
import { ok, unauthorized, handleError } from "@/lib/api/response";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const data = await getProfile(supabase, { userId: user.id });
        return ok(ProfileResponse.parse(data));
    } catch (error) {
        return handleError("GET /api/profiles", error);
    }
}
