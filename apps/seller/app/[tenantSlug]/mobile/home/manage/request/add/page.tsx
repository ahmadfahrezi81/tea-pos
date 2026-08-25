"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSupplyRequests } from "@/lib/hooks/requests/useSupplyRequests";
import { useUpload } from "@/lib/hooks/upload/useUpload";
import { SUPPLY_REQUEST_TYPES, SUPPLY_REQUEST_TYPE_LABELS } from "@tea-pos/features/requests/schema";
import { SelectInput } from "@tea-pos/ui/custom/SelectInput";
import { Textarea } from "@tea-pos/ui/custom/Textarea";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";
import { useT } from "@/lib/hooks/useT";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";
import { Field } from "@tea-pos/ui/custom/Field";

export default function AddRequestPage() {
    const router = useRouter();
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useSupplyRequests(selectedStoreId);
    const { upload } = useUpload();
    const t = useT();
    const { showError } = useErrorSheet();

    const todayStr = useMemo(() => getTodayLocalStr(), []);

    // Type names come from the shared schema and stay in English
    const TYPE_OPTIONS = useMemo(
        () =>
            SUPPLY_REQUEST_TYPES.map((type) => ({
                value: type,
                label: type === "other" ? t("manage.custom") : SUPPLY_REQUEST_TYPE_LABELS[type],
            })),
        [t],
    );

    const [selectedType, setSelectedType] = useState("");
    const [customTypeText, setCustomTypeText] = useState("");
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedType || !selectedStoreId) return;
        setIsSubmitting(true);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                photoUrl = await upload(photoFile, "store-requests", `${selectedStoreId}/${todayStr}`);
            }
            await create({
                type: selectedType,
                notes: notes.trim() || undefined,
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });
            router.back();
        } catch (err) {
            showError(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <Field label={t("manage.type")} required>
                    <SelectInput
                        options={TYPE_OPTIONS}
                        value={selectedType}
                        onChange={(v) => { setSelectedType(v); setNotes(""); }}
                        placeholder={t("manage.selectType")}
                        otherTriggerValue="other"
                        otherValue={customTypeText}
                        onOtherChange={setCustomTypeText}
                        otherPlaceholder="e.g. Napkins, Straws..."
                    />
                </Field>

                <Field label={t("manage.notes")}>
                    <Textarea
                        value={notes}
                        onChange={setNotes}
                        placeholder={t("manage.requestNotesPlaceholder")}
                        rows={3}
                        maxLength={500}
                    />
                </Field>

                <Field label={t("manage.photo")}>
                    <PhotoPicker
                        previewUrl={photoPreview}
                        onCapture={(file, url) => { setPhotoFile(file); setPhotoPreview(url); }}
                        onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    />
                </Field>
            </div>

            <FormFooter
                label={t("manage.submitRequest")}
                loadingLabel={t("common.loading")}
                onSubmit={handleSubmit}
                disabled={!selectedType}
                isLoading={isSubmitting}
            />
        </div>
    );
}
