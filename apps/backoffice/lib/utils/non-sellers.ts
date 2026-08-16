import type { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

/* Staff who earn no commission per cup — support roles rather than sellers.
   They still submit claims, so they own payouts; they are just filtered out
   of the seller-facing views by default. */
export const NON_SELLER_SLUG = "SELLER_0";

export function isNonSeller(info: PayrollUserInfoResponse | undefined): boolean {
    return info?.commissionConfigSlug === NON_SELLER_SLUG || (info?.ratePerCup ?? 0) === 0;
}
