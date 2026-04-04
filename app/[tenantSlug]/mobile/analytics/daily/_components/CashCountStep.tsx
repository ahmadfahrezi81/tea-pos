"use client";

import { formatRupiah } from "@/lib/utils/formatCurrency";
import { CashBreakdown } from "@/lib/schemas/daily-summaries";
import { useRef, useState } from "react";

const DENOMINATIONS: {
    value: keyof CashBreakdown;
    label: string;
    type: "bill" | "coin";
}[] = [
    { value: 100000, label: "Rp 100.000", type: "bill" },
    { value: 50000, label: "Rp 50.000", type: "bill" },
    { value: 20000, label: "Rp 20.000", type: "bill" },
    { value: 10000, label: "Rp 10.000", type: "bill" },
    { value: 5000, label: "Rp 5.000", type: "bill" },
    { value: 2000, label: "Rp 2.000", type: "bill" },
    { value: 1000, label: "Rp 1.000", type: "bill" },
    { value: 500, label: "Rp 500", type: "coin" },
    { value: 200, label: "Rp 200", type: "coin" },
    { value: 100, label: "Rp 100", type: "coin" },
];

interface CashCountStepProps {
    breakdown: CashBreakdown;
    onBreakdownChange: (breakdown: CashBreakdown) => void;
    expectedCash: number;
}

function calculateTotal(breakdown: CashBreakdown): number {
    return Object.entries(breakdown).reduce((sum, [denom, count]) => {
        return sum + parseInt(denom) * (count ?? 0);
    }, 0);
}

// ─── Moved outside CashCountStep to prevent remount on parent re-render ───
interface DenominationRowProps {
    value: keyof CashBreakdown;
    label: string;
    count: number;
    onChange: (value: keyof CashBreakdown, str: string) => void;
}

function DenominationRow({
    value,
    label,
    count,
    onChange,
}: DenominationRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEditStart = () => {
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleBlur = () => setIsEditing(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            inputRef.current?.blur();
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <p className="text-base font-medium text-gray-800">{label}</p>
            <div className="flex items-center gap-3">
                <button
                    onClick={() =>
                        onChange(value, String(Math.max(0, count - 1)))
                    }
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold active:scale-90 transition-transform"
                >
                    −
                </button>

                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={count === 0 ? "" : count}
                        onChange={(e) => onChange(value, e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        placeholder="0"
                        className="w-10 text-center text-base font-semibold text-gray-900 border-none outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                ) : (
                    <button
                        onClick={handleEditStart}
                        className="w-10 text-center text-base font-semibold text-gray-900"
                    >
                        {count === 0 ? "0" : count}
                    </button>
                )}

                <button
                    onClick={() => onChange(value, String(count + 1))}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold active:scale-90 transition-transform"
                >
                    +
                </button>
            </div>
        </div>
    );
}

export function CashCountStep({
    breakdown,
    onBreakdownChange,
    expectedCash,
}: CashCountStepProps) {
    const total = calculateTotal(breakdown);
    const variance = total - expectedCash;

    const handleChange = (denom: keyof CashBreakdown, value: string) => {
        const count = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
        onBreakdownChange({ ...breakdown, [denom]: count });
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">
                    Count the Cash
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                    Input the number of each denomination.
                </p>
            </div>

            {/* Running total */}
            <div
                className={`p-4 rounded-2xl transition-colors ${
                    total === 0
                        ? "bg-gray-50"
                        : variance === 0
                          ? "bg-green-50"
                          : variance > 0
                            ? "bg-blue-50"
                            : "bg-red-50"
                }`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-900 font-medium uppercase tracking-wide">
                            Total Counted
                        </p>
                        <p
                            className={`text-3xl font-bold mt-0.5 ${
                                total === 0
                                    ? "text-gray-400"
                                    : variance === 0
                                      ? "text-green-600"
                                      : variance > 0
                                        ? "text-blue-600"
                                        : "text-red-600"
                            }`}
                        >
                            {formatRupiah(total)}
                        </p>
                    </div>
                    <div
                        className={`text-right ${total === 0 ? "invisible" : ""}`}
                    >
                        <p className="text-sm text-gray-900 font-medium uppercase tracking-wide">
                            Variance
                        </p>
                        <p
                            className={`text-lg font-bold mt-0.5 ${
                                variance === 0
                                    ? "text-green-600"
                                    : variance > 0
                                      ? "text-blue-600"
                                      : "text-red-600"
                            }`}
                        >
                            {variance >= 0 ? "+" : ""}
                            {formatRupiah(variance)}
                        </p>
                    </div>
                </div>
                <p
                    className={`text-sm text-gray-700 mt-2 ${total === 0 ? "invisible" : ""}`}
                >
                    Expected: {formatRupiah(expectedCash)}
                </p>
            </div>

            {/* Bills */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                    Bills
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {DENOMINATIONS.filter((d) => d.type === "bill").map(
                        ({ value, label }) => (
                            <DenominationRow
                                key={value}
                                value={value}
                                label={label}
                                count={breakdown[value] ?? 0}
                                onChange={handleChange}
                            />
                        ),
                    )}
                </div>
            </div>

            {/* Coins */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                    Coins
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {DENOMINATIONS.filter((d) => d.type === "coin").map(
                        ({ value, label }) => (
                            <DenominationRow
                                key={value}
                                value={value}
                                label={label}
                                count={breakdown[value] ?? 0}
                                onChange={handleChange}
                            />
                        ),
                    )}
                </div>
            </div>

            <div className="h-4" />
        </div>
    );
}
