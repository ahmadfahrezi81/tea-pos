"use client";

import { useState, useEffect, useRef } from "react";

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
}

const formatDisplay = (val: number) =>
    val === 0 ? "" : val.toLocaleString("id-ID");

export function NumberInput({ value, onChange, placeholder = "0" }: NumberInputProps) {
    const [localValue, setLocalValue] = useState(formatDisplay(value));
    const dirty = useRef(false);

    // Only sync from parent when the user hasn't touched the field yet.
    // Once dirty, the user's typed value (including "0") takes precedence.
    useEffect(() => {
        if (!dirty.current) {
            setLocalValue(formatDisplay(value));
        }
    }, [value]);

    const handleChange = (raw: string) => {
        dirty.current = true;
        const digits = raw.replace(/\D/g, "");
        const num = parseInt(digits) || 0;
        // Use toLocaleString directly so "0" stays visible after typing it.
        setLocalValue(digits === "" ? "" : num.toLocaleString("id-ID"));
        onChange(num);
    };

    return (
        <div className="p-4 px-3 border border-gray-100 rounded-2xl bg-gray-50">
            <input
                type="text"
                inputMode="numeric"
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                className="text-3xl font-bold text-gray-900 border-none outline-none bg-transparent w-full"
            />
        </div>
    );
}
