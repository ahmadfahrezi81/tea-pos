// app/api/payments/qris/simulate/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UUIDSchema } from "@/lib/schemas/common";

const SimulateInput = z.object({
    xenditQrId: z.string(),
    amount: z.number(),
});

// ============================================================================
// POST /api/payments/qris/simulate
// Staging only — triggers Xendit sandbox simulate
// ============================================================================
export async function POST(request: NextRequest) {
    // block in production
    if (process.env.NEXT_PUBLIC_IS_STAGING !== "true") {
        return NextResponse.json(
            { error: "Not available in production" },
            { status: 403 },
        );
    }

    try {
        const supabase = await createRouteHandlerClient();

        // auth check
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = await request.json();
        const result = SimulateInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { xenditQrId, amount } = result.data;

        // call Xendit simulate
        const xenditResponse = await fetch(
            `https://api.xendit.co/qr_codes/${xenditQrId}/payments/simulate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2022-07-31",
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.XENDIT_API_KEY}:`,
                    ).toString("base64")}`,
                },
                body: JSON.stringify({ amount }),
            },
        );

        if (!xenditResponse.ok) {
            const xenditError = await xenditResponse.json();
            console.error("Xendit simulate error:", xenditError);
            return NextResponse.json(
                { error: "Simulate failed" },
                { status: 502 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
