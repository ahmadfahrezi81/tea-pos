"use client";

import { useState, useEffect, useRef } from "react";

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    currency?: boolean;
    unit?: string;
}

const formatDisplay = (val: number) =>
    val === 0 ? "" : val.toLocaleString("id-ID");

export function NumberInput({ value, onChange, placeholder = "0", currency = false, unit }: NumberInputProps) {
    const [localValue, setLocalValue] = useState(formatDisplay(value));
    const dirty = useRef(false);

    useEffect(() => {
        if (!dirty.current) {
            setLocalValue(formatDisplay(value));
        }
    }, [value]);

    const handleChange = (raw: string) => {
        dirty.current = true;
        const digits = raw.replace(/\D/g, "");
        const num = parseInt(digits) || 0;
        setLocalValue(digits === "" ? "" : num.toLocaleString("id-ID"));
        onChange(num);
    };

    return (
        <div className="flex items-center gap-2 p-4 px-3 border border-gray-100 rounded-2xl bg-gray-50">
            {currency && (
                <span className="text-3xl font-bold text-gray-400 shrink-0">Rp</span>
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
