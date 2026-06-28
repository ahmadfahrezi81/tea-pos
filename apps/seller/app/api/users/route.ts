import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { UserResponse, UpdateUserInput } from "@tea-pos/features/users/schema";
import { getUser, listTenantUsers, updateUser } from "@tea-pos/services/users";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();

        const { searchParams } = new URL(request.url);
        if (searchParams.get("all") === "true") {
            if (user.role !== "ADMIN") return forbidden();
            const tenantId = await getCurrentTenantId();
            const users = await listTenantUsers(supabase, { tenantId });
            return ok({ users });
        }

        const data = await getUser(supabase, { userId: user.id });
        return ok(UserResponse.parse(data));
    } catch (error) {
        return handleError("GET /api/users", error);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const body = UpdateUserInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const { fullName, phoneNumber, bankName, bankAccountNumber, bankAccountHolder } = body.data;
        const data = await updateUser(supabase, { userId: user.id, fullName, phoneNumber, bankName, bankAccountNumber, bankAccountHolder });

        return ok(UserResponse.parse(data));
    } catch (error) {
        return handleError("PATCH /api/users", error);
    }
}
