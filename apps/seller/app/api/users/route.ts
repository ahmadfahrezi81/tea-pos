import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { UserResponse } from "@tea-pos/features/users/schema";
import { getUser } from "@tea-pos/services/users";
import { ok, unauthorized, handleError } from "@/lib/api/response";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const data = await getUser(supabase, { userId: user.id });
        return ok(UserResponse.parse(data));
    } catch (error) {
        return handleError("GET /api/users", error);
    }
}
