import { apiFetch } from "./client";
import { UserResponse, UpdateUserInput, UpdateUserLanguageInput } from "@tea-pos/features/users/schema";

export const usersApi = {
    get: async () => {
        return UserResponse.parse(await apiFetch<unknown>("/api/users"));
    },

    listAll: async () => {
        const data = await apiFetch<{ users: unknown[] }>("/api/users?all=true");
        return data.users.map((u) => UserResponse.parse(u));
    },

    update: async (input: UpdateUserInput) => {
        return UserResponse.parse(
            await apiFetch<unknown>("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    updateLanguage: async (input: UpdateUserLanguageInput) => {
        await apiFetch<unknown>("/api/users/language", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },
};
