export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
        (err as Error & { status: number }).status = res.status;
        throw err;
    }
    return res.json() as Promise<T>;
}

export function buildParams(params: Record<string, unknown>): URLSearchParams {
    return new URLSearchParams(
        Object.fromEntries(
            Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)]),
        ),
    );
}
