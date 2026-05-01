// lib/hooks/users/useUpdateUser.ts
import useSWRMutation from "swr/mutation";
import {
    UpdateUserInputWithId,
    UpdateUserResponse,
} from "@/lib/shared/schemas/users";

async function updateUser(
    url: string,
    { arg }: { arg: UpdateUserInputWithId },
): Promise<UpdateUserResponse> {
    const { userId, ...body } = arg;

    const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
    }

    const data = await response.json();
    return UpdateUserResponse.parse(data);
}

export default function useUpdateUser() {
    return useSWRMutation("/api/users", updateUser);
}
