import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    ListExpensesQuery, ExpenseListResponse,
    CreateExpenseInput, CreateExpenseResponse,
    UpdateExpenseInput, UpdateExpenseResponse,
    DeleteExpenseResponse,
} from "@tea-pos/features/expenses/schema";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "@tea-pos/services/expenses";

function errResponse(error: unknown) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const query = ListExpensesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const data = await listExpenses(supabase, { tenantId, ...query.data });
        const parsed = ExpenseListResponse.safeParse({ expenses: data });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateExpenseInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        const expense = await createExpense(supabase, { tenantId, ...body.data });
        const parsed = CreateExpenseResponse.safeParse({ success: true, expense });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) { return errResponse(error); }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const body = UpdateExpenseInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        const expense = await updateExpense(supabase, { tenantId, ...body.data });
        const parsed = UpdateExpenseResponse.safeParse({ success: true, expense });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });

        const expense = await deleteExpense(supabase, { tenantId, id });
        const parsed = DeleteExpenseResponse.safeParse({ success: true, expense });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}
