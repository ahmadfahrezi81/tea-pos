import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    UploadSummaryPhotoInput, UploadSummaryPhotoResponse,
    DeleteSummaryPhotoResponse, ListSummaryPhotosQuery, ListSummaryPhotosResponse,
} from "@tea-pos/features/summaries/photos-schema";
import {
    listSummaryPhotos, uploadSummaryPhoto, updateSummaryPhoto,
    deleteSummaryPhoto, validatePhotoFile,
} from "@tea-pos/services/summaries";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListSummaryPhotosQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const photos = await listSummaryPhotos(supabase, { tenantId, ...query.data });
        const parsed = ListSummaryPhotosResponse.safeParse({ photos });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/summaries/photo", error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const quantityRaw = formData.get("quantity") as string | null;

        let quantity = null;
        if (quantityRaw) {
            try { quantity = JSON.parse(quantityRaw); }
            catch { return badRequest("Invalid quantity format"); }
        }

        const input = UploadSummaryPhotoInput.safeParse({
            dailySummaryId: formData.get("dailySummaryId"),
            storeId: formData.get("storeId"),
            type: formData.get("type"),
            expenseId: (formData.get("expenseId") as string | null) ?? undefined,
            quantity: quantity ?? undefined,
        });
        if (!input.success) return badRequest("Invalid input");
        if (!file) return badRequest("No file provided");

        const fileError = validatePhotoFile(file);
        if (fileError) return badRequest(fileError);

        const photo = await uploadSummaryPhoto(supabase, {
            tenantId,
            dailySummaryId: input.data.dailySummaryId,
            storeId: input.data.storeId,
            type: input.data.type,
            fileBuffer: await file.arrayBuffer(),
            fileType: file.type,
            expenseId: input.data.expenseId,
            quantity: input.data.quantity,
        });

        const parsed = UploadSummaryPhotoResponse.safeParse({ success: true, photo });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) { return handleError("POST /api/summaries/photo", error); }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const { id, quantity } = await request.json();
        if (!id) return badRequest("Photo ID is required");

        const photo = await updateSummaryPhoto(supabase, { tenantId, id, quantity });
        return ok({ success: true, photo });
    } catch (error) { return handleError("PATCH /api/summaries/photo", error); }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return badRequest("Photo ID is required");

        const photo = await deleteSummaryPhoto(supabase, { tenantId, id });
        const parsed = DeleteSummaryPhotoResponse.safeParse({ success: true, photo });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("DELETE /api/summaries/photo", error); }
}
