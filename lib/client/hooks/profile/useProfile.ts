import useSWR from "swr";

const fetcher = (url: string) =>
    fetch(url).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
    });

export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR("/api/profiles", fetcher);

    return {
        profile: data ?? null,
        isLoading,
        isError: !!error,
        mutate,
    };
}
