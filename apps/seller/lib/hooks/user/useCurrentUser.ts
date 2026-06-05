import useSWR from "swr";
import { usersApi } from "@/lib/api/users";
import type { User } from "@tea-pos/features/users/schema";

export function useCurrentUser() {
    const { data, error, isLoading, mutate } = useSWR<User>(
        "user",
        () => usersApi.get(),
        { revalidateOnFocus: false, dedupingInterval: 300_000 },
    );

    return {
        user: data ?? null,
        isLoading,
        isError: !!error,
        mutate,
    };
}
