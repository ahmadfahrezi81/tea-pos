// lib/hooks/users/useCreateUser.ts
import useSWRMutation from "swr/mutation";
import { CreateUserInput, CreateUserResponse } from "@/lib/schemas/users";

async function createUser(
    url: string,
    { arg }: { arg: CreateUserInput }
): Promise<CreateUserResponse> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(arg),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
    }

    const data = await response.json();
    return CreateUserResponse.parse(data);
}

export default function useCreateUser() {
    return useSWRMutation("/api/users", createUser);
}
