// app/api/summaries/photo/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    UploadSummaryPhotoInput,
    UploadSummaryPhotoResponse,
    DeleteSummaryPhotoResponse,
    ListSummaryPhotosQuery,
    ListSummaryPhotosResponse,
} from "@/lib/shared/schemas/daily-summary-photos";
import { toCamelKeys } from "@/lib/shared/utils/schemas";

const BUCKET = "daily-photos";
const ALLOWED_MIME_TYPES = [
    "image/webp",
    "image/jpeg",
    "image/jpg",
    "image/heic",
    "image/heif",
    "image/png",
];
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

// ============================================================================
// GET /api/summaries/photo
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListSummaryPhotosQuery.safeParse(
            Object.fromEntries(searchParams),
        );
        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 },
            );
        }

        const { dailySummaryId, expenseId, type } = queryResult.data;

        let query = supabase
            .from("daily_summary_photos")
            .select("*")
            .eq("tenant_id", currentTenantId)
            .order("created_at", { ascending: true });

        if (dailySummaryId)
            query = query.eq("daily_summary_id", dailySummaryId);
        if (expenseId) query = query.eq("expense_id", expenseId);
        if (type) query = query.eq("type", type);

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // ─── Generate signed URLs ──────────────────────────────────────
        const photosWithSignedUrls = await Promise.all(
            (
                (data ?? []) as Array<{ url: string; [key: string]: unknown }>
            ).map(async (photo) => {
                const storagePath = photo.url.split(`/${BUCKET}/`)[1];
                if (!storagePath) return photo;

                const { data: signedData } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(storagePath, 60 * 60); // 1 hour

                return {
                    ...photo,
                    url: signedData?.signedUrl ?? photo.url,
                };
            }),
        );

        const camelData = toCamelKeys(photosWithSignedUrls);
        const parsed = ListSummaryPhotosResponse.safeParse({
            photos: camelData,
        });
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("[GET /api/summaries/photo]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// POST /api/summaries/photo
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();

        // ─── Parse multipart form data ─────────────────────────────────
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const dailySummaryId = formData.get("dailySummaryId") as string | null;
        const expenseId = formData.get("expenseId") as string | null;
        const storeId = formData.get("storeId") as string | null;
        const type = formData.get("type") as string | null;
        const quantityRaw = formData.get("quantity") as string | null;

        // ─── Parse quantity JSON if provided ───────────────────────────
        let quantity = null;
        if (quantityRaw) {
            try {
                quantity = JSON.parse(quantityRaw);
            } catch {
                return NextResponse.json(
                    { error: "Invalid quantity format" },
                    { status: 400 },
                );
            }
        }

        // ─── Validate input fields ─────────────────────────────────────
        const inputResult = UploadSummaryPhotoInput.safeParse({
            dailySummaryId,
            storeId,
            type,
            expenseId: expenseId ?? undefined,
            quantity: quantity ?? undefined,
        });

        if (!inputResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: inputResult.error.format() },
                { status: 400 },
            );
        }

        // ─── Validate file ─────────────────────────────────────────────
        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 },
            );
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only WebP and JPEG are allowed." },
                { status: 400 },
            );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 1MB." },
                { status: 400 },
            );
        }

        // ─── Verify daily summary belongs to tenant ────────────────────
        const { data: summary, error: summaryError } = await supabase
            .from("daily_summaries")
            .select("id, date, store_id")
            .eq("id", inputResult.data.dailySummaryId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (summaryError || !summary) {
            return NextResponse.json(
                { error: "Daily summary not found or access denied" },
                { status: 404 },
            );
        }

        // ─── Build storage path ────────────────────────────────────────
        const ext = file.type === "image/webp" ? "webp" : "jpg";
        const timestamp = Date.now();
        const storagePath = `${currentTenantId}/${summary.store_id}/${summary.date}/${inputResult.data.type}/${timestamp}.${ext}`;

        // ─── Upload to Supabase storage ────────────────────────────────
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, arrayBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error(
                "[POST /api/summaries/photo] Upload error:",
                uploadError.message,
                uploadError,
            );
            return NextResponse.json(
                { error: "Failed to upload photo" },
                { status: 500 },
            );
        }

        // ─── Get public URL ────────────────────────────────────────────
        const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        const photoUrl = urlData.publicUrl;

        // ─── Save record to DB ─────────────────────────────────────────
        const { data: photoData, error: insertError } = await supabase
            .from("daily_summary_photos")
            .insert({
                daily_summary_id: inputResult.data.dailySummaryId,
                expense_id: inputResult.data.expenseId ?? null,
                store_id: inputResult.data.storeId,
                tenant_id: currentTenantId,
                type: inputResult.data.type,
                url: photoUrl,
                quantity: inputResult.data.quantity ?? null,
            })
            .select()
            .single();

        if (insertError || !photoData) {
            await supabase.storage.from(BUCKET).remove([storagePath]);
            return NextResponse.json(
                { error: "Failed to save photo record" },
                { status: 500 },
            );
        }

        // ─── Validate and return response ──────────────────────────────
        const camelPhoto = toCamelKeys(photoData);
        const parsed = UploadSummaryPhotoResponse.safeParse({
            success: true,
            photo: camelPhoto,
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error("[POST /api/summaries/photo]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// PATCH /api/summaries/photo
// ============================================================================
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const { id, quantity } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Photo ID is required" },
                { status: 400 },
            );
        }

        // ─── Verify photo belongs to tenant ───────────────────────────
        const { data: photo, error: fetchError } = await supabase
            .from("daily_summary_photos")
            .select("id")
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (fetchError || !photo) {
            return NextResponse.json(
                { error: "Photo not found or access denied" },
                { status: 404 },
            );
        }

        // ─── Update quantity ───────────────────────────────────────────
        const { data: updated, error: updateError } = await supabase
            .from("daily_summary_photos")
            .update({ quantity: quantity ?? null })
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (updateError || !updated) {
            return NextResponse.json(
                { error: "Failed to update photo" },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            photo: toCamelKeys(updated),
        });
    } catch (error) {
        console.error("[PATCH /api/summaries/photo]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// DELETE /api/summaries/photo
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Photo ID is required" },
                { status: 400 },
            );
        }

        const { data: photo, error: fetchError } = await supabase
            .from("daily_summary_photos")
            .select("*")
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (fetchError || !photo) {
            return NextResponse.json(
                { error: "Photo not found" },
                { status: 404 },
            );
        }

        const urlParts = photo.url.split(`/daily-photos/`);
        const storagePath = urlParts[1];

        if (storagePath) {
            const { error: storageError } = await supabase.storage
                .from(BUCKET)
                .remove([storagePath]);

            if (storageError) {
                console.error(
                    "[DELETE /api/summaries/photo] Storage delete error:",
                    storageError,
                );
            }
        }

        const { error: deleteError } = await supabase
            .from("daily_summary_photos")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId);

        if (deleteError) {
            return NextResponse.json(
                { error: deleteError.message },
                { status: 400 },
            );
        }

        const camelPhoto = toCamelKeys(photo);
        const parsed = DeleteSummaryPhotoResponse.safeParse({
            success: true,
            photo: camelPhoto,
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("[DELETE /api/summaries/photo]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
