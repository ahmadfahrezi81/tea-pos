"use client";

import { useState, useEffect, useRef } from "react";

interface NumberInputProps {
    value: number | string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (value: any) => void;
    placeholder?: string;
    currency?: boolean;
    unit?: string;
    /** Text prefix shown before the input (e.g. "+62" for phone). Overrides currency Rp. */
    prefix?: string;
    /** Compact form-field styling instead of the large card style. */
    compact?: boolean;
    /** Keep value as a digit string instead of parsing to number (preserves leading zeros). */
    asString?: boolean;
}

const formatDisplay = (val: number) =>
    val === 0 ? "" : val.toLocaleString("id-ID");

export function NumberInput({
    value,
    onChange,
    placeholder = "0",
    currency = false,
    unit,
    prefix,
    compact = false,
    asString = false,
}: NumberInputProps) {
    const initDisplay = asString
        ? String(value ?? "")
        : formatDisplay(value as number);
    const [localValue, setLocalValue] = useState(initDisplay);
    const dirty = useRef(false);

    useEffect(() => {
        if (!dirty.current) {
            setLocalValue(
                asString ? String(value ?? "") : formatDisplay(value as number),
            );
        }
    }, [value, asString]);

    const handleChange = (raw: string) => {
        dirty.current = true;
        const digits = raw.replace(/\D/g, "");
        if (asString) {
            setLocalValue(digits);
            onChange(digits);
        } else {
            const num = parseInt(digits) || 0;
            setLocalValue(digits === "" ? "" : num.toLocaleString("id-ID"));
            onChange(num);
        }
    };

    const showPrefix = prefix ?? (currency ? "Rp" : undefined);

    if (compact) {
        return (
            <div className="flex items-center gap-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/40">
                {showPrefix && (
                    <span className="text-base text-gray-500 shrink-0">{showPrefix}</span>
                )}
                <input
                    type="text"
                    inputMode="numeric"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={placeholder}
                    className="text-base text-gray-900 border-none outline-none bg-transparent w-full min-w-0"
                />
                {unit && (
                    <span className="text-base text-gray-500 shrink-0">{unit}</span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 p-4 px-3 border border-gray-100 rounded-2xl bg-gray-50">
            {showPrefix && (
                <span className="text-3xl font-bold text-gray-400 shrink-0">
                    {showPrefix}
                </span>
            )}
            <input
                type="text"
                inputMode="numeric"
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                className="text-3xl font-bold text-gray-900 border-none outline-none bg-transparent w-full min-w-0"
            />
            {unit && (
                <span className="text-3xl font-bold text-gray-400 shrink-0">{unit}</span>
            )}
        </div>
    );
}
