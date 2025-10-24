import useSWRMutation from "swr/mutation";
import { CreateStoreInput, CreateStoreResponse } from "@/lib/schemas/stores";

async function createStoreFetcher(
    url: string,
    { arg }: { arg: CreateStoreInput }
) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create store");
    }
    return (await res.json()) as CreateStoreResponse;
}

export default function useCreateStore() {
    const { trigger, isMutating, error } = useSWRMutation(
        "/api/stores",
        createStoreFetcher
    );
    return { trigger, isMutating, error };
}
