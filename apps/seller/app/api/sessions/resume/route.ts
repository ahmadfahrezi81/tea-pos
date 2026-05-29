import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ResumeSessionInput, ResumeSessionResponse } from "@tea-pos/features/sessions/schema";
import { resumeSession } from "@tea-pos/services/sessions";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = ResumeSessionInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const result = await resumeSession(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });

        return ok(ResumeSessionResponse.parse(result), 201);
    } catch (error) { return handleError("POST /api/sessions/resume", error); }
}
