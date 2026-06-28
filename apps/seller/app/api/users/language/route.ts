import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { UpdateUserLanguageInput } from "@tea-pos/features/users/schema";
import { updateUserLanguage } from "@tea-pos/services/users";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";

export async function PATCH(request: Request) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const body = UpdateUserLanguageInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const supabase = getServiceClient();
        await updateUserLanguage(supabase, { userId: user.id, language: body.data.language });

        return ok({ success: true });
    } catch (error) {
        return handleError("PATCH /api/users/language", error);
    }
}
