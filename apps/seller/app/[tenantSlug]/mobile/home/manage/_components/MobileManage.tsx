"use client";

import { useState } from "react";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { AtAGlance } from "../../_components/AtAGlance";
import { WeatherButton } from "../../pos/_components/WeatherButton";
import { WeatherDrawer } from "../../pos/_components/WeatherDrawer";
import { ChevronRight, CheckCircle, DollarSign, XCircle } from "lucide-react";

export default function MobileManage() {
    const { url } = useTenantSlug();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);

    return (
        <div className="flex flex-col gap-4 pb-24">
            <AtAGlance />

            {/* Weather card */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                <div>
                    <p className="font-medium text-gray-800">
                        Weather Forecast
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Check today&apos;s forecast
                    </p>
                </div>
                <WeatherButton onClick={() => setIsWeatherOpen(true)} />
            </div>

            {/* Store actions */}
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                <ActionRow
                    icon={<CheckCircle size={20} className="text-green-600" />}
                    label="Open Store"
                    sublabel="Start today's session"
                    onClick={() =>
                        navigation.push(url("/mobile/home/manage/open"))
                    }
                    highlight
                />
                <ActionRow
                    icon={<DollarSign size={20} className="text-blue-600" />}
                    label="Add Expenses"
                    sublabel="Log costs for today"
                    onClick={() =>
                        navigation.push(url("/mobile/home/manage/expense"))
                    }
                />
                <ActionRow
                    icon={<XCircle size={20} className="text-red-500" />}
                    label="Close Day"
                    sublabel="Count cash and finalize"
                    onClick={() =>
                        navigation.push(url("/mobile/home/manage/close"))
                    }
                    danger
                />
            </div>

            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
            />
        </div>
    );
}

function ActionRow({
    icon,
    label,
    sublabel,
    onClick,
    highlight = false,
    danger = false,
}: {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick: () => void;
    highlight?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors ${highlight ? "bg-green-50 active:bg-green-100" : ""}`}
        >
            <span className="shrink-0">{icon}</span>
            <div className="flex-1">
                <p
                    className={`font-medium ${
                        danger
                            ? "text-red-600"
                            : highlight
                              ? "text-green-700"
                              : "text-gray-800"
                    }`}
                >
                    {label}
                </p>
                {sublabel && (
                    <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
                )}
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </button>
    );
}
