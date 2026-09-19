import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import { SWR } from "@tea-pos/utils/swr";

export function useSessionActivity(weeks = 16) {
    const { data, isLoading } = useSWR(
        ["session-activity", weeks],
        () => sessionsApi.getActivity(weeks),
        { dedupingInterval: SWR.COOL },
    );

    return { dates: data?.dates ?? [], isLoading };
}
