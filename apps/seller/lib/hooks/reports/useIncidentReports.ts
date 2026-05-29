import useSWR from "swr";
import { reportsApi } from "@/lib/api/reports";
import type { CreateIncidentReportInput, IncidentReportResponse } from "@tea-pos/features/reports/schema";

export function useIncidentReports(storeId?: string, date?: string) {
    const { data, error, mutate, isLoading } = useSWR(
        storeId ? `incident-reports-${storeId}-${date ?? "today"}` : null,
        () => reportsApi.list({ storeId: storeId!, date }),
        { revalidateOnFocus: false, dedupingInterval: 10000 },
    );

    const create = async (input: Omit<CreateIncidentReportInput, "storeId">): Promise<IncidentReportResponse> => {
        const result = await reportsApi.create({ storeId: storeId!, ...input });
        await mutate();
        return result;
    };

    return {
        reports: data?.reports ?? [],
        isLoading,
        error,
        mutate,
        create,
    };
}
