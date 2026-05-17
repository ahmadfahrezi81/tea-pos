import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreateIncidentReportInput,
    ListIncidentReportsQuery,
    IncidentReportResponse,
    IncidentReportListResponse,
} from "@tea-pos/features/reports/schema";
import { createIncidentReport, listIncidentReports } from "@tea-pos/services/reports";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListIncidentReportsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await listIncidentReports(supabase, { tenantId, ...query.data });
        const parsed = IncidentReportListResponse.safeParse({ reports: data });
        if (!parsed.success) return badRequest("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/reports", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = CreateIncidentReportInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const data = await createIncidentReport(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });
        const parsed = IncidentReportResponse.safeParse(data);
        if (!parsed.success) return badRequest("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) {
        return handleError("POST /api/reports", error);
    }
}
