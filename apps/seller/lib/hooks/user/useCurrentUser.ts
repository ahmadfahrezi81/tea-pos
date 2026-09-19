import useSWR from "swr";
import { usersApi } from "@/lib/api/users";
import type { User, UpdateUserInput } from "@tea-pos/features/users/schema";

export function useCurrentUser() {
    /* No tier, deliberately. `"user"` is shared with `AuthContext`, which is
       mounted at the root and seeds this key from the `x-user-info` cookie. A
       dedupe window is per key but the config is per hook, so a tier declared
       here would hold only when this hook happens to be the one revalidating —
       two files would be claiming different windows for one key. The key takes
       the floor in both instead. See task 067. */
    const { data, error, isLoading, mutate } = useSWR<User>("user", () => usersApi.get());

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
