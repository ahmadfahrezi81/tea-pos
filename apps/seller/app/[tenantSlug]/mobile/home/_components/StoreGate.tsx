"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { TakeOverCard } from "./TakeOverCard";
import { navigation } from "@tea-pos/utils/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { getWeekInfo } from "@tea-pos/utils/week";
import { useT } from "@/lib/hooks/useT";

function GateIcon({ icon }: { icon: string }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="relative w-[100px] h-[100px] mx-auto mb-5">
            {!loaded && <div className="absolute inset-0 rounded-2xl bg-gray-200" />}
            <Icon icon={icon} width={100} height={100} className="absolute inset-0" onLoad={() => setLoaded(true)} />
        </div>
    );
}

interface StoreGateProps {
    gate: string | null;
    isPosInUse?: boolean;
    onTransfer?: (code: string) => Promise<unknown>;
    sessionUserName?: string | null;
    sessionUserAvatarUrl?: string | null;
}

export function StoreGate({ gate, isPosInUse, onTransfer, sessionUserName, sessionUserAvatarUrl }: StoreGateProps) {
    const { url } = useTenantSlug();
    const t = useT();

    return (
        <div className="bg-white rounded-2xl w-full h-full flex flex-col items-center justify-center p-6">
            {isPosInUse && onTransfer ? (
                <div className="w-full">
                    <p className="font-mono text-md font-semibold text-gray-700 text-center">{getWeekInfo().label}</p>
                    <TakeOverCard
                        onTransfer={onTransfer}
                        userName={sessionUserName}
                        userAvatarUrl={sessionUserAvatarUrl}
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
