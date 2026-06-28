import { apiFetch } from "./client";
import { UserResponse } from "@tea-pos/features/users/schema";

export const usersApi = {
    listAll: async () => {
        const data = await apiFetch<{ users: unknown[] }>("/api/users");
        return data.users.map((u) => UserResponse.parse(u));
    },
};
