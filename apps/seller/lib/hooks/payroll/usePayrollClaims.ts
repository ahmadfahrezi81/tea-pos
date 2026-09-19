"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { payrollClaimsApi } from "@/lib/api/payroll-claims";
import type {
    PayrollClaimListResponse,
    CreatePayrollClaimInput,
    GetClaimableTypesQuery,
    GetClaimableDatesQuery,
    ClaimableTypesResponse,
    ClaimableDatesResponse,
} from "@tea-pos/features/payroll-claims/schema";
import { SWR } from "@tea-pos/utils/swr";

export function usePayrollClaims() {
    const { user } = useAuth();
    const userId = user?.id;

    const key = userId ? `payroll-claims-${userId}` : null;

    const { data, error, mutate, isLoading } = useSWR<PayrollClaimListResponse>(
        key,
        () => payrollClaimsApi.list(),
        { dedupingInterval: SWR.COOL },
    );

    const create = async (input: CreatePayrollClaimInput) => {
        const claim = await payrollClaimsApi.create(input);
        await mutate();
        return claim;
    };

    return {
        claims: data?.claims ?? [],
        isLoading,
        error,
        mutate,
        create,
    };
}

export function useClaimableTypes(params: GetClaimableTypesQuery | null) {
    const { data, error, isLoading } = useSWR<ClaimableTypesResponse>(
        params ? `claimable-types-${params.startDate}-${params.endDate}` : null,
        () => payrollClaimsApi.getClaimableTypes(params!),
        { dedupingInterval: SWR.COOL },
    );

    return {
        types: data?.types ?? [],
        isLoading,
        error,
    };
}

export function useClaimableDates(params: GetClaimableDatesQuery | null) {
    const { data, error, isLoading } = useSWR<ClaimableDatesResponse>(
        params ? `claimable-dates-${params.startDate}-${params.endDate}` : null,
        () => payrollClaimsApi.getClaimableDates(params!),
        { dedupingInterval: SWR.COOL },
    );

    return {
        dates: data?.dates ?? [],
        isLoading,
        error,
    };
}
