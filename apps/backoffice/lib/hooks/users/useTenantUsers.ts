"use client";

import useSWR from "swr";
import { usersApi } from "@/lib/api/users";
import type { User } from "@tea-pos/features/users/schema";

export function useTenantUsers() {
    const { data, error, mutate, isLoading } = useSWR<User[]>(
        "tenant-users",
        () => usersApi.listAll(),
    );
    return { users: data ?? [], isLoading, error, mutate };
}
