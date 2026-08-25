"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSummaryPhotos } from "@/lib/hooks/summaries/useSummaryPhotos";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { useFlags } from "@/lib/context/FlagsContext";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { Field } from "@tea-pos/ui/custom/Field";
import { FormFooter } from "@/components/shared/FormFooter";
import { useT } from "@/lib/hooks/useT";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";

export default function OpenStorePage() {
    const { selectedStoreId, selectedStore } = useStore();
    const { url } = useTenantSlug();
    const { gate, openStore, resumeSession } = useSession(selectedStoreId);
    const { uploadPhoto } = useSummaryPhotos();
    const { flags: { isSkipManagePhotosEnabled: skipManagePhotos } } = useFlags();
    const t = useT();
    const { showError } = useErrorSheet();

    const todayStr = useMemo(() => getTodayLocalStr(), []);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [balanceConfirmed, setBalanceConfirmed] = useState(false);
    const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedStoreId || (!photo && !skipPhotos)) return;
        setIsSubmitting(true);
        try {
            let dailySummaryId: string;
            if (gate === "no_summary") {
                const result = await openStore({ date: todayStr, openingBalance });
                dailySummaryId = result.dailySummary.id;
            } else if (gate === "no_session") {
                const result = await resumeSession();
                dailySummaryId = result.session.dailySummaryId;
            } else {
                return;
            }

            if (photo) {
                await uploadPhoto({ file: photo.file, dailySummaryId, storeId: selectedStoreId, type: "opening" });
            }
            navigation.push(url("/mobile/home/manage"));
        } catch (err) {
            showError(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const skipPhotos = skipManagePhotos;

    const canSubmit =
        (!!photo || skipPhotos) &&
        !isSubmitting &&
        !!selectedStoreId &&
        (gate === "no_summary" || gate === "no_session") &&
        (gate === "no_session" || balanceConfirmed);

    return (
        <div className="space-y-4 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-3">
                <Field label={t("manage.storeLabel")}>
                    <p className="font-semibold text-gray-800">{selectedStore?.name ?? "Unknown Store"}</p>
                </Field>
                <Field label={t("manage.date")}>
                    <p className="font-semibold text-gray-800">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </Field>
            </div>

            {/* Balance and photo are the two things this screen asks for, so
                they share one card. The asterisk carries what the helper text
                and the "Required" / "(optional)" pills used to say. */}
            <div className="bg-white rounded-xl p-4 space-y-4">
                {gate !== "no_session" && (
                    <Field label={t("manage.openingBalanceLabel")} required>
                        <NumberInput
                            currency
                            value={openingBalance || null}
                            onChange={(val) => {
                                setOpeningBalance(val ?? 0);
                                setBalanceConfirmed(true);
                            }}
                        />
                    </Field>
                )}

                <Field label={t("manage.openingPhoto")} required={!skipPhotos}>
                    <PhotoPicker
                        previewUrl={photo?.preview ?? null}
                        onCapture={(file, url) => {
                            if (photo) URL.revokeObjectURL(photo.preview);
                            setPhoto({ file, preview: url });
                        }}
                        onRemove={() => {
                            if (photo) URL.revokeObjectURL(photo.preview);
                            setPhoto(null);
                        }}
                    />
                </Field>
            </div>

            <FormFooter
                label={t("manage.openStore")}
                loadingLabel={t("manage.opening")}
                onSubmit={handleSubmit}
                disabled={!canSubmit}
                isLoading={isSubmitting}
            />
        </div>
    );
}
