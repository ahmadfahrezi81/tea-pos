"use client";
import { DailySummary } from "@tea-pos/features/summaries/schema";
import { SummaryDetailsCard } from "@/components/SummaryDetailsCard";
import { useSummaryBreakdown } from "@/lib/hooks/summaries/useSummaryBreakdown";
import {
    SavedSlottedPhoto,
    SlottedPhoto,
} from "@tea-pos/features/summaries/photos-schema";

interface ReviewStepProps {
    summary: DailySummary;
    photos: SlottedPhoto[];
    savedPhotos: SavedSlottedPhoto[];
    notes: string;
    storeName: string;
    confirmed: boolean;
    onConfirmChange: (confirmed: boolean) => void;
}

export function ReviewStep({
    summary,
    photos,
    savedPhotos,
    notes,
    storeName,
    confirmed,
    onConfirmChange,
}: ReviewStepProps) {
    const { breakdown } = useSummaryBreakdown(summary.id);

    const dateLabel = new Date(summary.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const combinedPhotos = [
        ...savedPhotos.map(p => ({ ...p, url: p.url })),
        ...photos.map(p => ({ ...p, url: p.preview })),
    ];

    return (
        <SummaryDetailsCard
            summary={summary}
            breakdown={breakdown}
            photos={combinedPhotos}
            expenses={summary.expenses ?? []}
            sessions={summary.sessions ?? []}
            dateLabel={dateLabel}
            showConfirmation={true}
            confirmed={confirmed}
            onConfirmChange={onConfirmChange}
        />
    );
}
