import useSWR from "swr";
import { profilesApi } from "@/lib/api/profiles";
import type { Profile } from "@tea-pos/features/profiles/schema";

export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR<Profile>(
        "profile",
        () => profilesApi.get(),
    );

    return {
        profile: data ?? null,
        isLoading,
        isError: !!error,
        mutate,
    };
}
