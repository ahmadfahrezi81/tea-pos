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

interface UsePayrollClaimsOptions {
    all?: boolean;
}

export function usePayrollClaims(options?: UsePayrollClaimsOptions) {
    const { user } = useAuth();
    const userId = user?.id;
    const isAll = options?.all === true;

    const key = isAll ? "payroll-claims-all" : userId ? `payroll-claims-${userId}` : null;

    const { data, error, mutate, isLoading } = useSWR<PayrollClaimListResponse>(
        key,
        () => (isAll ? payrollClaimsApi.listAll() : payrollClaimsApi.list()),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
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
        { revalidateOnFocus: false, dedupingInterval: 60000 },
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
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return {
        dates: data?.dates ?? [],
        isLoading,
        error,
    };
}
