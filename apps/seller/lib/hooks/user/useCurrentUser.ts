import useSWR from "swr";
import { usersApi } from "@/lib/api/users";
import type { User, UpdateUserInput } from "@tea-pos/features/users/schema";

export function useCurrentUser() {
    const { data, error, isLoading, mutate } = useSWR<User>(
        "user",
        () => usersApi.get(),
        { revalidateOnFocus: false, dedupingInterval: 300_000 },
    );

    const update = async (input: UpdateUserInput) => {
        const updated = await usersApi.update(input);
        mutate(updated, { revalidate: false });
        return updated;
    };

    return {
        user: data ?? null,
        isLoading,
        isError: !!error,
        mutate,
        update,
    };
}
