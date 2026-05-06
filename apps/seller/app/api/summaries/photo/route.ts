import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    UploadSummaryPhotoInput, UploadSummaryPhotoResponse,
    DeleteSummaryPhotoResponse, ListSummaryPhotosQuery, ListSummaryPhotosResponse,
} from "@tea-pos/features/summaries/photos-schema";
import {
    listSummaryPhotos, uploadSummaryPhoto, updateSummaryPhoto,
    deleteSummaryPhoto, validatePhotoFile,
} from "@tea-pos/services/summaries";

function errResponse(error: unknown) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const query = ListSummaryPhotosQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const photos = await listSummaryPhotos(supabase, { tenantId, ...query.data });
        const parsed = ListSummaryPhotosResponse.safeParse({ photos });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const quantityRaw = formData.get("quantity") as string | null;

        let quantity = null;
        if (quantityRaw) {
            try { quantity = JSON.parse(quantityRaw); }
            catch { return NextResponse.json({ error: "Invalid quantity format" }, { status: 400 }); }
        }

        const input = UploadSummaryPhotoInput.safeParse({
            dailySummaryId: formData.get("dailySummaryId"),
            storeId: formData.get("storeId"),
            type: formData.get("type"),
            expenseId: (formData.get("expenseId") as string | null) ?? undefined,
            quantity: quantity ?? undefined,
        });
        if (!input.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const fileError = validatePhotoFile(file);
        if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

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
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) { return errResponse(error); }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const { id, quantity } = await request.json();
        if (!id) return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });

        const photo = await updateSummaryPhoto(supabase, { tenantId, id, quantity });
        return NextResponse.json({ success: true, photo });
    } catch (error) { return errResponse(error); }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });

        const photo = await deleteSummaryPhoto(supabase, { tenantId, id });
        const parsed = DeleteSummaryPhotoResponse.safeParse({ success: true, photo });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}
