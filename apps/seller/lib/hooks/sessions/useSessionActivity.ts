import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";

export function useSessionActivity(weeks = 16) {
    const { data, isLoading } = useSWR(
        ["session-activity", weeks],
        () => sessionsApi.getActivity(weeks),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );

    return { dates: data?.dates ?? [], isLoading };
}
