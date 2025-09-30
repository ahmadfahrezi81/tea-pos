export function getBackendVersion() {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
    return `${date}-${sha}`;
}
