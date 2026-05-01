// export function getBackendVersion() {
//     const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

//     const commitDate = process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE
//         ? new Date(Number(process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE))
//         : new Date();

//     const month = String(commitDate.getMonth() + 1).padStart(2, "0");
//     const day = String(commitDate.getDate()).padStart(2, "0");
//     const year = String(commitDate.getFullYear()).slice(-2);

//     console.log("Author date:", process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE);
//     console.log("Parsed date:", commitDate.toISOString());

//     return `${day}.${month}.${year}-${sha}`;
// }

//lib/version.ts
import packageJson from "../../package.json";

export function getBackendVersion() {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
    return `${packageJson.backendVersionDate}-${sha}`;
}
