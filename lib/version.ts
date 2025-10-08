export function getBackendVersion() {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

    const commitDate = process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE
        ? new Date(process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE)
        : new Date();

    const month = String(commitDate.getMonth() + 1).padStart(2, "0");
    const day = String(commitDate.getDate()).padStart(2, "0");
    const year = String(commitDate.getFullYear()).slice(-2);
    return `${day}.${month}.${year}-${sha}`;
}
