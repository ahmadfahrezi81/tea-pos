"use client";

import { Icon } from "@iconify/react";
import { TakeOverCard } from "./TakeOverCard";
import { navigation } from "@tea-pos/utils/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { getWeekInfo } from "@tea-pos/utils/week";
import { useT } from "@/lib/hooks/useT";
import { DOT_GRID } from "@/lib/styles/dot-grid";
import "@/lib/icons/bundled-emoji";

// No loading skeleton: these icons are bundled, so there is no moment where the
// art has not arrived yet.
function GateIcon({ icon }: { icon: string }) {
    return (
        <div className="relative -mx-6 mb-5 flex justify-center py-3">
            <div aria-hidden className="pointer-events-none absolute inset-0" style={DOT_GRID} />
            <Icon icon={icon} width={100} height={100} className="relative" />
        </div>
    );
}

interface StoreGateProps {
    gate: string | null;
    isPosInUse?: boolean;
    onTransfer?: (code: string) => Promise<unknown>;
    sessionUserName?: string | null;
    sessionUserAvatarUrl?: string | null;
    sessionUserId?: string | null;
    summaryId?: string | null;
}

export function StoreGate({
    gate,
    isPosInUse,
    onTransfer,
    sessionUserName,
    sessionUserAvatarUrl,
    sessionUserId,
    summaryId,
}: StoreGateProps) {
    const { url } = useTenantSlug();
    const t = useT();

    return (
        <div className="bg-white rounded-2xl w-full min-h-full flex flex-col items-center justify-center p-6">
            {isPosInUse && onTransfer ? (
                <div className="w-full">
                    <TakeOverCard
                        onTransfer={onTransfer}
                        userName={sessionUserName}
                        userAvatarUrl={sessionUserAvatarUrl}
                        userId={sessionUserId}
                        summaryId={summaryId}
                    />
                </div>
            ) : gate === "closed" ? (
                <div className="text-center w-full max-w-xs">
                    <GateIcon icon="fluent-emoji:alarm-clock" />
                    <p className="font-mono text-md font-semibold text-gray-700">{getWeekInfo().label}</p>
                    <p className="font-bold text-gray-900 text-2xl tracking-tight">{t("home.gate.closed")}</p>
                    <p className="text-base text-gray-500 mt-2">{t("home.gate.closedSub")}</p>
                </div>
            ) : (
                <div className="text-center w-full max-w-xs">
                    <GateIcon icon="fluent-emoji:convenience-store" />
                    <p className="font-mono text-md font-semibold text-gray-700">{getWeekInfo().label}</p>
                    <p className="font-bold text-gray-900 text-2xl tracking-tight">{t("home.gate.notOpen")}</p>
                    <p className="text-base text-gray-500 mt-2 mb-7">{t("home.gate.notOpenSub")}</p>
                    <button
                        onClick={() => navigation.push(url("/mobile/home/manage/open"))}
                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base active:scale-95 transition-transform"
                    >
                        {t("home.gate.openStore")}
                    </button>
                </div>
            )}
        </div>
    );
}
