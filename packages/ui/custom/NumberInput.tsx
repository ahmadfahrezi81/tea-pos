"use client";

import { useState, useEffect, useRef } from "react";

interface NumberInputProps {
    /**
     * `null` is the empty field. 0 is a real value and stays distinct from it —
     * a field can legitimately be zero (no tea left, no cups used), and callers
     * that need "required" have to be able to tell the two apart.
     */
    value: number | null;
    onChange: (value: number | null) => void;
    placeholder?: string;
    currency?: boolean;
    unit?: string;
    prefix?: string;
    /** Skip thousand-separator formatting — for phone numbers, bank accounts, etc. */
    raw?: boolean;
}

export function NumberInput({ value, onChange, placeholder = "0", currency = false, unit, prefix, raw = false }: NumberInputProps) {
    const display = (val: number | null) =>
        val === null ? "" : raw ? String(val) : val.toLocaleString("id-ID");
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
        if (digits === "") {
            setLocalValue("");
            onChange(null);
            return;
        }
        const num = parseInt(digits);
        setLocalValue(raw ? digits : num.toLocaleString("id-ID"));
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
