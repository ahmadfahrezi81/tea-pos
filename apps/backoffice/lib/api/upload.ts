import { apiFetch } from "./client";

/* Kept in step with the route's own list — the route rejects anything else, so a
   typo here is a compile error rather than a 400 at the till. */
export const ALLOWED_UPLOAD_BUCKETS = ["payroll-proofs", "reimbursements"] as const;
export type UploadBucket = (typeof ALLOWED_UPLOAD_BUCKETS)[number];

export const uploadApi = {
    upload: async (file: File, bucket: UploadBucket, subPath = "") => {
        const form = new FormData();
        form.append("file", file);
        form.append("bucket", bucket);
        if (subPath) form.append("subPath", subPath);
        return apiFetch<{ url: string }>("/api/upload", {
            method: "POST",
            body: form,
        });
    },
};
