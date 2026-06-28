"use client";

import { useState, useEffect, useRef } from "react";

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    currency?: boolean;
    unit?: string;
    prefix?: string;
    /** Skip thousand-separator formatting — for phone numbers, bank accounts, etc. */
    raw?: boolean;
}

const formatDisplay = (val: number) =>
    val === 0 ? "" : val.toLocaleString("id-ID");

export function NumberInput({ value, onChange, placeholder = "0", currency = false, unit, prefix, raw = false }: NumberInputProps) {
    const display = (val: number) => raw ? (val === 0 ? "" : String(val)) : formatDisplay(val);
    const [localValue, setLocalValue] = useState(display(value));
    const dirty = useRef(false);

    useEffect(() => {
        if (!dirty.current) {
            setLocalValue(display(value));
        }
    }, [value]);

    const handleChange = (input: string) => {
        dirty.current = true;
        const digits = input.replace(/\D/g, "");
        const num = parseInt(digits) || 0;
        setLocalValue(digits === "" ? "" : raw ? digits : num.toLocaleString("id-ID"));
        onChange(num);
    };

    return (
        <div className="flex items-center gap-2 p-4 px-3 border border-gray-100 rounded-2xl bg-gray-50">
            {(currency || prefix) && (
                <span className="text-2xl font-bold text-gray-400 shrink-0">{prefix ?? "Rp"}</span>
            )}
            <input
                type="text"
                inputMode="numeric"
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent w-full min-w-0"
            />
            {unit && (
                <span className="text-2xl font-bold text-gray-400 shrink-0">{unit}</span>
            )}
        </div>
    );
}
