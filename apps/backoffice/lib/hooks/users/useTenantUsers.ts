"use client";

import useSWR from "swr";
import { usersApi } from "@/lib/api/users";
import type { User } from "@tea-pos/features/users/schema";
import { SWR } from "@tea-pos/utils/swr";

/** `COLD` — six screens mount this, and staff change when someone is hired. */
export function useTenantUsers() {
    const { data, error, mutate, isLoading } = useSWR<User[]>(
        "tenant-users",
        () => usersApi.listAll(),
        { dedupingInterval: SWR.COLD },
    );
    return { users: data ?? [], isLoading, error, mutate };
}
