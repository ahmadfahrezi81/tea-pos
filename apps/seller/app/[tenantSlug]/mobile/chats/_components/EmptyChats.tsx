"use client";
import { ComingSoon } from "@tea-pos/ui/custom/ComingSoon";
import { useT } from "@/lib/hooks/useT";

export default function EmptyChats() {
    const t = useT();
    return (
        <ComingSoon
            title={t("chats.emptyTitle")}
            subtitle={t("chats.emptySubtitle")}
        />
    );
}
