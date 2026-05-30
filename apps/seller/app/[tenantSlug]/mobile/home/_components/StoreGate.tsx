"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { TakeOverCard } from "./TakeOverCard";
import { navigation } from "@tea-pos/utils/navigation";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";

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

    return (
        <div className="bg-white rounded-2xl w-full h-full flex flex-col items-center justify-center p-6">
            {isPosInUse && onTransfer ? (
                <TakeOverCard
                    onTransfer={onTransfer}
                    userName={sessionUserName}
                    userAvatarUrl={sessionUserAvatarUrl}
                />
            ) : gate === "closed" ? (
                <div className="text-center w-full max-w-xs">
                    <GateIcon icon="fluent-emoji:alarm-clock" />
                    <p className="font-bold text-gray-900 text-2xl tracking-tight">Store is closed</p>
                    <p className="text-base text-gray-500 mt-2">Today&apos;s session has ended.</p>
                </div>
            ) : (
                <div className="text-center w-full max-w-xs">
                    <GateIcon icon="fluent-emoji:convenience-store" />
                    <p className="font-bold text-gray-900 text-2xl tracking-tight">Store not open yet</p>
                    <p className="text-base text-gray-500 mt-2 mb-7">
                        Open the store to start taking orders today.
                    </p>
                    <button
                        onClick={() => navigation.push(url("/mobile/home/manage/open"))}
                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base active:scale-95 transition-transform"
                    >
                        Open Store
                    </button>
                </div>
            )}
        </div>
    );
}
