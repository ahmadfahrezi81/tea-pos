import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { createCustomerFeedback, listCustomerFeedbacks } from "@tea-pos/services/customer-feedbacks";
import {
    CreateCustomerFeedbackInput,
    ListCustomerFeedbacksQuery,
} from "@tea-pos/features/customer-feedbacks/schema";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();

        const { searchParams } = new URL(request.url);
        const parsed = ListCustomerFeedbacksQuery.safeParse({
            tenantId: searchParams.get("tenantId") ?? undefined,
            userId: searchParams.get("userId") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
            offset: searchParams.get("offset") ?? undefined,
        });
        if (!parsed.success) return badRequest("Invalid query params");

        const { data, total, error } = await listCustomerFeedbacks(supabase, parsed.data);
        if (error) return err(error as string);

        return ok({ feedbacks: data, total });
    } catch (error) {
        return handleError("GET /api/customer-feedbacks", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const parsed = CreateCustomerFeedbackInput.safeParse(await request.json());
        if (!parsed.success) return badRequest("Invalid request body");

        const { data, error } = await createCustomerFeedback(supabase, {
            input: parsed.data,
            tenantId,
            userId: user.id,
        });
        if (error) return err(error as string);

        return ok({ success: true, feedback: data }, 201);
    } catch (error) {
        return handleError("POST /api/customer-feedbacks", error);
    }
}
