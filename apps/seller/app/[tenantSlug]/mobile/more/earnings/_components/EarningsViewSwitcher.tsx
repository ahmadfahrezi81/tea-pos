"use client";

import { useT } from "@/lib/hooks/useT";

export type EarningsView = "config" | "calendar";

export function EarningsViewSwitcher({
    view,
    onChange,
}: {
    view: EarningsView;
    onChange: (view: EarningsView) => void;
}) {
    const t = useT();

    const tabs: { value: EarningsView; label: string }[] = [
        { value: "calendar", label: t("earnings.viewCalendar") },
        { value: "config", label: t("earnings.viewConfig") },
    ];

    return (
        <div className="flex items-center bg-slate-200 rounded-xl p-1 self-start">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`px-3.5 py-0.5 rounded-lg text-[17px] font-semibold transition-all duration-200 ${
                        view === tab.value ? "bg-white text-slate-950" : "text-slate-600"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
