"use client";

import useSWRMutation from "swr/mutation";
import { toast } from "sonner";
import { DeleteStoreResponse } from "@/lib/schemas/stores";

async function deleteStoreFetcher(
    url: string,
    { arg }: { arg: { id: string } }
) {
    const res = await fetch(`${url}?id=${arg.id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        let errorMsg = "Failed to delete store";
        try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errorMsg);
    }

    const data = await res.json();

    // Validate with your zod schema if available
    const parsed = DeleteStoreResponse.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid response from server");
    }

    return parsed.data;
}

export default function useDeleteStore() {
    const { trigger, isMutating, error } = useSWRMutation(
        "/api/stores",
        deleteStoreFetcher
    );

    async function handleDelete(id: string) {
        try {
            await trigger({ id });
            toast.success("Store deleted successfully");
            return true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
            return false;
        }
    }

    return {
        deleteStore: handleDelete,
        isDeleting: isMutating,
        error,
    };
}
