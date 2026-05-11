import { getRequestUser } from "@/lib/auth/get-request-user";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

const SimulateInput = z.object({
    xenditQrId: z.string(),
    amount: z.number(),
});

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const body = await request.json();
        const result = SimulateInput.safeParse(body);
        if (!result.success) return badRequest("Validation failed");

        const { xenditQrId, amount } = result.data;

        const xenditResponse = await fetch(
            `https://api.xendit.co/qr_codes/${xenditQrId}/payments/simulate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2022-07-31",
                    Authorization: `Basic ${Buffer.from(`${process.env.XENDIT_API_KEY}:`).toString("base64")}`,
                },
                body: JSON.stringify({ amount }),
            },
        );

        if (!xenditResponse.ok) {
            logger.error("POST /api/payments/qris/simulate Xendit error", await xenditResponse.json());
            return err("Simulate failed", 502);
        }

        return ok({ success: true });
    } catch (error) {
        return handleError("POST /api/payments/qris/simulate", error);
    }
}
