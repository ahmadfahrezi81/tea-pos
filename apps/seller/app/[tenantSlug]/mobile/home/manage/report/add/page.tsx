"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { useUpload } from "@/lib/hooks/upload/useUpload";
import {
    INCIDENT_CATEGORIES,
    INCIDENT_CATEGORY_LABELS,
} from "@tea-pos/features/reports/schema";
import { SelectInput } from "../../_components/shared/SelectInput";
import { Textarea } from "../../_components/shared/Textarea";
import { PhotoPicker } from "../../_components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";
import { useT } from "@/lib/hooks/useT";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";

export default function AddReportPage() {
    const router = useRouter();
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useIncidentReports(selectedStoreId);
    const { upload } = useUpload();
    const t = useT();
    const { showError } = useErrorSheet();

    const todayStr = useMemo(() => getTodayLocalStr(), []);

    // Category names come from the shared schema and stay in English
    const TYPE_OPTIONS = useMemo(
        () =>
            INCIDENT_CATEGORIES.map((category) => ({
                value: category,
                label: category === "other" ? t("manage.custom") : INCIDENT_CATEGORY_LABELS[category],
            })),
        [t],
    );

    const [selectedType, setSelectedType] = useState("");
    const [customType, setCustomType] = useState("");
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resolvedType = selectedType === "other" ? customType.trim() : selectedType;
    const isValid = !!resolvedType && notes.trim().length > 0;

    const handleSubmit = async () => {
        if (!isValid || !selectedStoreId) return;
        setIsSubmitting(true);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                photoUrl = await upload(photoFile, "store-reports", `${selectedStoreId}/${todayStr}`);
            }
            await create({
                type: resolvedType,
                notes: notes.trim(),
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
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("manage.type")}
                    </p>
                    <SelectInput
                        options={TYPE_OPTIONS}
                        value={selectedType}
                        onChange={(v) => { setSelectedType(v); setCustomType(""); }}
                        placeholder={t("manage.selectType")}
                        otherTriggerValue="other"
                        otherValue={customType}
                        onOtherChange={setCustomType}
                        otherPlaceholder={t("manage.incidentTypePlaceholder")}
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("manage.notes")}
                    </p>
                    <Textarea
                        value={notes}
                        onChange={setNotes}
                        placeholder={t("manage.reportNotesPlaceholder")}
                        rows={4}
                        maxLength={1000}
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("manage.photo")}
                    </p>
                    <PhotoPicker
                        previewUrl={photoPreview}
                        onCapture={(file, url) => { setPhotoFile(file); setPhotoPreview(url); }}
                        onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    />
                </div>
            </div>

            <FormFooter
                label={t("manage.submitReport")}
                loadingLabel={t("common.loading")}
                onSubmit={handleSubmit}
                disabled={!isValid}
                isLoading={isSubmitting}
            />
        </div>
    );
}
