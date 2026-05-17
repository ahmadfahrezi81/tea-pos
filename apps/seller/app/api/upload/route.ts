import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";

const BUCKET = "daily-photos";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_MB = 2;

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const prefix = (formData.get("prefix") as string | null) ?? "uploads";

        if (!file) return badRequest("No file provided");
        if (!ALLOWED_TYPES.includes(file.type)) return badRequest("Only JPEG and WebP images are accepted");
        if (file.size > MAX_SIZE_MB * 1024 * 1024) return badRequest(`File exceeds ${MAX_SIZE_MB}MB`);

        const ext = file.type === "image/webp" ? "webp" : "jpg";
        const storagePath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const supabase = getServiceClient();
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, await file.arrayBuffer(), {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) throw new Error("Failed to upload file");

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

        return ok({ url: urlData.publicUrl }, 201);
    } catch (error) {
        return handleError("POST /api/upload", error);
    }
}
