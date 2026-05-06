import { apiFetch } from "./client";
import { ProfileResponse } from "@tea-pos/features/profiles/schema";

export const profilesApi = {
    get: async () => {
        return ProfileResponse.parse(await apiFetch<unknown>("/api/profiles"));
    },
};
