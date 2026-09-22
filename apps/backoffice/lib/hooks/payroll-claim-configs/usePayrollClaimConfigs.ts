"use client";

import useSWR, { useSWRConfig } from "swr";
import { useMemo } from "react";
import { payrollClaimConfigsApi } from "@/lib/api/payroll-claim-configs";
import type {
    CreatePayrollClaimConfigInput,
    UpdatePayrollClaimConfigInput,
    SetClaimEligibilityInput,
} from "@tea-pos/features/payroll-claim-configs/schema";
import { SWR } from "@tea-pos/utils/swr";

/** One key for the whole tenant's eligibility — one read, one invalidation. */
const ELIGIBILITY_KEY = "claim-eligibility";

/** `STATIC` — tenant config, and every write below invalidates this key. */
export function usePayrollClaimConfigs() {
    const { data, error, mutate, isLoading } = useSWR(
        "payroll-claim-configs",
        () => payrollClaimConfigsApi.list(),
        { dedupingInterval: SWR.STATIC },
    );

    const create = async (input: CreatePayrollClaimConfigInput) => {
        await payrollClaimConfigsApi.create(input);
        await mutate();
    };

    const update = async (id: string, input: UpdatePayrollClaimConfigInput) => {
        const updated = await payrollClaimConfigsApi.update(id, input);
        await mutate();
        return updated;
    };

    /* Unawaited: the caller saves several users then navigates, and nothing on
       the next screen reads this key. SWR collapses the concurrent calls. */
    const { mutate: globalMutate } = useSWRConfig();
    const setEligibility = async (input: SetClaimEligibilityInput) => {
        await payrollClaimConfigsApi.setEligibility(input);
        void globalMutate(ELIGIBILITY_KEY).catch(() => {});
    };

    return {
        claimTypes: data?.claimTypes ?? [],
        isLoading,
        error,
        mutate,
        create,
        update,
        setEligibility,
    };
}

/**
 * Every staff member's eligibility, in one request. Replaced a per-`userId`
 * hook that was called inside a row loop — a request per member of staff.
 *
 * `COLD`; `setEligibility` invalidates this key directly.
 */
export function useClaimEligibility() {
    const { data, error, mutate, isLoading } = useSWR(
        ELIGIBILITY_KEY,
        async () => (await payrollClaimConfigsApi.listEligibility()).eligibility,
        { dedupingInterval: SWR.COLD },
    );

    /* Grouped once: the wire is flat pairs, every reader wants one user's ids —
       including the toggle, which sends the whole set back. */
    const byUser = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const row of data ?? []) (map[row.userId] ??= []).push(row.claimConfigId);
        return map;
    }, [data]);

    return { byUser, isLoading, error, mutate };
}
