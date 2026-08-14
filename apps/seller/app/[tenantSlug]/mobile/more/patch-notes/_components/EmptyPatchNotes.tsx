"use client";
import { ComingSoon } from "@tea-pos/ui/custom/ComingSoon";
import { useT } from "@/lib/hooks/useT";

export default function EmptyPatchNotes() {
    const t = useT();
    return (
        <ComingSoon
            title={t("patchNotes.emptyTitle")}
            subtitle={t("patchNotes.emptySubtitle")}
        />
    );
}
