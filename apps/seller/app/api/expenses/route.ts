import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    ListExpensesQuery, ExpenseListResponse,
    CreateExpenseInput, CreateExpenseResponse,
    UpdateExpenseInput, UpdateExpenseResponse,
    DeleteExpenseResponse,
} from "@tea-pos/features/expenses/schema";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "@tea-pos/services/expenses";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListExpensesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await listExpenses(supabase, { tenantId, ...query.data });
        const parsed = ExpenseListResponse.safeParse({ expenses: data });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/expenses", error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateExpenseInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const expense = await createExpense(supabase, { tenantId, ...body.data });
        const parsed = CreateExpenseResponse.safeParse({ success: true, expense });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) { return handleError("POST /api/expenses", error); }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = UpdateExpenseInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const expense = await updateExpense(supabase, { tenantId, ...body.data });
        const parsed = UpdateExpenseResponse.safeParse({ success: true, expense });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("PUT /api/expenses", error); }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return badRequest("Expense ID is required");

        const expense = await deleteExpense(supabase, { tenantId, id });
        const parsed = DeleteExpenseResponse.safeParse({ success: true, expense });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("DELETE /api/expenses", error); }
}
