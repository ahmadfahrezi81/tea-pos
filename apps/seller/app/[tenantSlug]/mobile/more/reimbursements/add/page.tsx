"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useT } from "@/lib/hooks/useT";
import { usePayrollClaims, useClaimableTypes, useClaimableDates } from "@/lib/hooks/payroll/usePayrollClaims";
import { usePayFrequency } from "@/lib/context/PayFrequencyContext";
import { getPayWindowBounds } from "@tea-pos/utils/week";
import { useUpload } from "@/lib/hooks/upload/useUpload";
import { SelectInput } from "@tea-pos/ui/custom/SelectInput";
import { Textarea } from "@tea-pos/ui/custom/Textarea";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { ReadOnlyInput } from "@tea-pos/ui/custom/ReadOnlyInput";
import { Field } from "@tea-pos/ui/custom/Field";
import { FormFooter } from "@/components/shared/FormFooter";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

function getLocalToday() {
    const offset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    return new Date(Date.now() + offset * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AddClaimPage() {
    const router = useRouter();
    const { user } = useAuth();
    const t = useT();
    const { create } = usePayrollClaims();
    const { upload } = useUpload();
    const payFrequency = usePayFrequency();
    const { showError } = useErrorSheet();

    const window = payFrequency ? getPayWindowBounds(getLocalToday(), payFrequency) : null;

    const { types, isLoading: typesLoading } = useClaimableTypes(window);
    const { dates: claimableDates, isLoading: datesLoading } = useClaimableDates(window);

    const [selectedTypeId, setSelectedTypeId] = useState("");
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedType = types.find((type) => type.id === selectedTypeId);
    const isWeekly = selectedType?.frequency === "weekly";
    const amount = selectedType?.amount ?? 0;

    const effectiveDate = isWeekly
        ? (claimableDates.includes(date) ? date : (claimableDates[claimableDates.length - 1] ?? getLocalToday()))
        : getLocalToday();

    const typeOptions = types
        .filter((type) => type.claimable && type.claimSource === "manual")
        .map((type) => ({ value: type.id, label: type.name }));

    const isValid = !!selectedTypeId && amount > 0 && (!isWeekly || claimableDates.includes(effectiveDate));

    const handleSubmit = async () => {
        if (!isValid || !user) return;
        setIsSubmitting(true);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                photoUrl = await upload(photoFile, "reimbursements", `${user.id}/${effectiveDate}`);
            }
            await create({ claimConfigId: selectedTypeId, amount, date: effectiveDate, notes: notes.trim() || undefined, photoUrl });
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
                <Field label={t("claims.typeLabel")} required>
                    {typesLoading ? (
                        <Skeleton className="h-12 rounded-xl" />
                    ) : types.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">{t("claims.noClaimEntitlements")}</p>
                    ) : typeOptions.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">{t("claims.allSubmitted")}</p>
                    ) : (
                        <SelectInput
                            options={typeOptions}
                            value={selectedTypeId}
                            onChange={(v) => {
                                setSelectedTypeId(v);
                                const newType = types.find((type) => type.id === v);
                                if (newType?.frequency === "weekly" && claimableDates.length > 0) {
                                    const today = getLocalToday();
                                    setDate(claimableDates.includes(today) ? today : claimableDates[claimableDates.length - 1]);
                                } else {
                                    setDate("");
                                }
                            }}
                            placeholder={t("claims.selectType")}
                        />
                    )}
                </Field>

                {selectedType && <>
                    <Field label={t("claims.amountLabel")} required>
                        <ReadOnlyInput value={`Rp ${amount.toLocaleString("id-ID")}`} />
                    </Field>

                    <Field label={t("claims.dateLabel")} required>
                        {isWeekly ? (
                            datesLoading ? (
                                <Skeleton className="h-12 rounded-xl" />
                            ) : claimableDates.length === 0 ? (
                                <p className="text-sm text-gray-400 py-2">{t("claims.noWorkedDates")}</p>
                            ) : (
                                <SelectInput
                                    options={claimableDates.map((d: string) => ({
                                        value: d,
                                        label: format(parseISO(d), "EEE, d MMM yyyy"),
                                    }))}
                                    value={effectiveDate}
                                    onChange={setDate}
                                />
                            )
                        ) : (
                            <ReadOnlyInput value={format(parseISO(effectiveDate), "EEE, d MMM yyyy")} />
                        )}
                    </Field>

                    <Field label={t("claims.receiptPhoto")}>
                        <PhotoPicker
                            previewUrl={photoPreview}
                            onCapture={(file, url) => { setPhotoFile(file); setPhotoPreview(url); }}
                            onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
                            allowGallery
                        />
                    </Field>
                    <Field label={t("claims.notesLabel")}>
                        <Textarea
                            value={notes}
                            onChange={setNotes}
                            placeholder={t("claims.notesPlaceholder")}
                            rows={3}
                            maxLength={500}
                        />
                    </Field>
                </>}
            </div>

            <FormFooter
                label={t("claims.submitClaim")}
                loadingLabel={t("claims.submitting")}
                onSubmit={handleSubmit}
                disabled={!isValid || typeOptions.length === 0}
                isLoading={isSubmitting}
            />
        </div>
    );
}
