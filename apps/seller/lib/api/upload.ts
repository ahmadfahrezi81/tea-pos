import { apiFetch } from "./client";

export const ALLOWED_UPLOAD_BUCKETS = [
    "store-reports",
    "store-requests",
    "reimbursements",
    "payroll-proofs",
] as const;
export type UploadBucket = (typeof ALLOWED_UPLOAD_BUCKETS)[number];

export const uploadApi = {
    upload: async (file: File, bucket: UploadBucket, subPath: string) => {
        const form = new FormData();
        form.append("file", file);
        form.append("bucket", bucket);
        form.append("subPath", subPath);
        return apiFetch<{ url: string }>("/api/upload", {
            method: "POST",
            body: form,
        });
    },
};
