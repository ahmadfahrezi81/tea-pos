import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";

const ALLOWED_BUCKETS = ["store-reports", "store-requests", "reimbursements", "payroll-proofs"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_MB = 2;

// Only allow path segments that are safe: UUIDs, dates (YYYY-MM-DD), alphanumeric, dash, underscore.
// Rejects anything with ".." or characters outside the allowed set.
function isSafeSubPath(s: string): boolean {
    return s === "" || (/^[a-zA-Z0-9\-_/]+$/.test(s) && !s.includes(".."));
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const tenantId = await getCurrentTenantId();
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const bucket = formData.get("bucket") as string | null;
        const rawSubPath = (formData.get("subPath") as string | null) ?? "";

        if (!bucket || !(ALLOWED_BUCKETS as readonly string[]).includes(bucket)) {
            return badRequest("Invalid or missing bucket");
        }
        if (!isSafeSubPath(rawSubPath)) {
            return badRequest("Invalid subPath");
        }
        if (!file) return badRequest("No file provided");
        if (!ALLOWED_TYPES.includes(file.type)) return badRequest("Only JPEG and WebP images are accepted");
        if (file.size > MAX_SIZE_MB * 1024 * 1024) return badRequest(`File exceeds ${MAX_SIZE_MB}MB`);

        const supabase = getServiceClient();

        if ((bucket === "store-reports" || bucket === "store-requests") && rawSubPath) {
            const storeId = rawSubPath.split("/")[0];
            const { count } = await supabase
                .from("stores")
                .select("id", { count: "exact", head: true })
                .eq("id", storeId)
                .eq("tenant_id", tenantId);
            if (!count) return badRequest("Store not found");
        }

        const ext = file.type === "image/webp" ? "webp" : "jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = rawSubPath
            ? `${tenantId}/${rawSubPath}/${filename}`
            : `${tenantId}/${filename}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket as AllowedBucket)
            .upload(storagePath, await file.arrayBuffer(), {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) throw new Error("Failed to upload file");

        const { data: urlData } = supabase.storage.from(bucket as AllowedBucket).getPublicUrl(storagePath);

        return ok({ url: urlData.publicUrl }, 201);
    } catch (error) {
        return handleError("POST /api/upload", error);
    }
}
