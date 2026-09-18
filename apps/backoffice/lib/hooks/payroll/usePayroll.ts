"use client";

import useSWR, { useSWRConfig } from "swr";
import { useCallback } from "react";
import { payrollApi } from "@/lib/api/payroll";
import type { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";

/** Prefix of every payouts-list key, so one write can invalidate them all. */
const PAYOUTS_KEY_PREFIX = "payouts-";

export function usePayouts(params?: Partial<ListPayoutsQuery>) {
    const key = `${PAYOUTS_KEY_PREFIX}${params?.startDate ?? ""}-${params?.endDate ?? ""}-${params?.userId ?? "all"}`;
    const { data, error, mutate, isLoading } = useSWR<PayoutListResponse>(
        key,
        () => payrollApi.getPayouts(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { payouts: data?.payouts ?? [], isLoading, error, mutate };
}

export type PayslipRowStatus = "pending" | "approved" | "rejected";

export type PayslipCommission = {
    id: string; date: string; storeName?: string | null;
    totalCups: number; ratePerCup: number; totalCommission: number;
    status: PayslipRowStatus;
};

export type PayslipClaim = {
    id: string; date: string; claimTypeName?: string | null;
    amount: number; status: PayslipRowStatus;
};

export type Payslip = {
    payout: {
        id: string; startDate: string; endDate: string; status: string;
        paidAt: string | null; paymentProofUrl: string | null; notes: string | null;
    };
    commissions: PayslipCommission[];
    claims: PayslipClaim[];
    commissionsTotal: number;
    claimsTotal: number;
    totalPay: number;
    ratePerCup: number;
    totalOrders: number;
    paidByName: string | null;
};

export function usePayslip(payoutId: string | undefined, userId?: string) {
    const key = payoutId ? `payslip-${payoutId}-${userId ?? "none"}` : null;
    const { data, error, mutate, isLoading } = useSWR<Payslip>(
        key,
        () => payrollApi.getPayslip({ payoutId: payoutId!, ...(userId ? { userId } : {}) }) as Promise<Payslip>,
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    /* There is deliberately no upsert-on-open here. One used to run on every
       mount, and it cannot have been creating the payout row: `getPayslip` reads
       that row and answers 404 without it, so by the time this renders the row
       exists. All it did was recompute the totals — which is now the job of the
       write that changes them — at the cost of a write and a second refetch on
       every open, including opens of a payout that was already paid. */

    /* Approving a row changes the payout's totals, and those totals are what the
       payouts list renders — a different SWR key, which `mutate` below does not
       touch. Without this the list keeps its cached figure on the way back, and
       `dedupingInterval` can hold that for another five seconds. */
    const { mutate: globalMutate } = useSWRConfig();
    const refreshPayoutLists = useCallback(
        () =>
            globalMutate(
                (key) => typeof key === "string" && key.startsWith(PAYOUTS_KEY_PREFIX),
            ),
        [globalMutate],
    );

    /* Every write below refetches before it re-throws. A settled payout answers
       422, and the day review has already flipped its rows locally — without the
       refetch the screen would keep insisting on a decision the server
       refused. */
    const withTruth = useCallback(
        async <T,>(write: () => Promise<T>) => {
            try {
                return await write();
            } catch (error) {
                await mutate();
                throw error;
            }
        },
        [mutate],
    );

    /**
     * Approve or reject every pending row on one date.
     *
     * Optimistic: the server decides exactly the rows that are pending *now*,
     * and pending is also all this flips locally, so the two agree.
     * `revalidate: false` keeps the refetch from racing the paint — the
     * revalidate afterwards does it once.
     */
    const reviewDay = useCallback(
        async (date: string, status: Exclude<PayslipRowStatus, "pending">) => {
            if (!userId) return;
            await mutate(
                (current) => {
                    if (!current) return current;
                    const settle = <T extends { date: string; status: string }>(rows: T[]) =>
                        rows.map((row) =>
                            row.date === date && row.status === "pending" ? { ...row, status } : row,
                        );
                    return {
                        ...current,
                        commissions: settle(current.commissions),
                        claims: settle(current.claims),
                    };
                },
                { revalidate: false },
            );
            await withTruth(() => payrollApi.reviewDay({ userId, date, status }));
            await Promise.all([mutate(), refreshPayoutLists()]);
        },
        [userId, mutate, withTruth, refreshPayoutLists],
    );

    const setCommissionStatus = useCallback(
        async (commissionId: string, status: Exclude<PayslipRowStatus, "pending">) => {
            await withTruth(() => payrollApi.updateCommission(commissionId, { status }));
            await Promise.all([mutate(), refreshPayoutLists()]);
        },
        [mutate, withTruth, refreshPayoutLists],
    );

    /** Mark the payout paid, or skipped when nothing is owed. */
    const settlePayout = useCallback(
        async (input: { status: "paid" | "skipped"; paymentProofUrl?: string; notes?: string }) => {
            if (!payoutId) return;
            await withTruth(() => payrollApi.updatePayout(payoutId, input));
            await Promise.all([mutate(), refreshPayoutLists()]);
        },
        [payoutId, mutate, withTruth, refreshPayoutLists],
    );

    const setClaimStatus = useCallback(
        async (claimId: string, status: Exclude<PayslipRowStatus, "pending">) => {
            await withTruth(() => payrollApi.updateClaimStatus(claimId, { status }));
            await Promise.all([mutate(), refreshPayoutLists()]);
        },
        [mutate, withTruth, refreshPayoutLists],
    );

    return {
        payslip: data ?? null,
        isLoading,
        error,
        mutate,
        reviewDay,
        setCommissionStatus,
        setClaimStatus,
        settlePayout,
    };
}
