/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost) and
 * Safari 15.4+. Testing the PWA on a phone over a LAN IP is plain HTTP, where
 * it is undefined and throws — so anything that generates ids at runtime needs
 * this fallback. Ids here are for local keying only, never for anything
 * security-sensitive.
 */
export function randomId(): string {
    if (typeof crypto !== "undefined") {
        if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
        if (typeof crypto.getRandomValues === "function") {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        }
    }
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
