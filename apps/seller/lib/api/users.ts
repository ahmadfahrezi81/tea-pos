import { apiFetch } from "./client";
import { UserResponse } from "@tea-pos/features/users/schema";

export const usersApi = {
    get: async () => {
        return UserResponse.parse(await apiFetch<unknown>("/api/users"));
    },
};
