import { NextResponse } from "next/server";

// payroll_periods table has been removed — payouts now own their date range.
export async function GET() {
    return NextResponse.json({ error: "payroll/periods is no longer available" }, { status: 410 });
}
