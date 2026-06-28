"use client";

import { getExpectedPayoutDate } from "@tea-pos/utils/week";

export function useExpectedPayoutDate(endDate: string | undefined): string | null {
    if (!endDate) return null;
    return getExpectedPayoutDate(endDate);
}
