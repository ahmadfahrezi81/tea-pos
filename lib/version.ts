export function getBackendVersion() {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

    // Use the commit date from Vercel env var, fallback to current date for local dev
    const commitDate = process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE
        ? new Date(process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE)
        : new Date();

    const date = commitDate.toISOString().slice(0, 10).replace(/-/g, ".");
    return `${date}-${sha}`;
}
