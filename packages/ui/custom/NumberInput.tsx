"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Pencil } from "lucide-react";

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
    /**
     * Skip thousand-separator formatting, for digit runs that are not amounts.
     *
     * Still a number, so it cannot hold a leading zero and loses precision past
     * Number.MAX_SAFE_INTEGER. Anything where those matter — account numbers,
     * reference codes — wants TextInput with inputMode="numeric" instead.
     */
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

    /**
     * An <input> has no intrinsic content width, so a full-width one pins the
     * unit to the far edge of the field, far from the digits it belongs to.
     * Measuring the text in a hidden twin lets the input size to its value, so
     * "2.000 pcs" reads as one phrase and the unit follows the number as it
     * grows. `field-sizing: content` would do this in CSS, but is Chromium-only.
     */
    const mirrorRef = useRef<HTMLSpanElement>(null);
    const [contentWidth, setContentWidth] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (mirrorRef.current) setContentWidth(mirrorRef.current.offsetWidth);
    }, [localValue, placeholder]);

    // A first paint in the fallback font measures the wrong width, and nothing
    // else would re-measure until the next keystroke — so the field would sit
    // mis-sized for the whole visit. Re-measure once the real font lands.
    useEffect(() => {
        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled && mirrorRef.current) setContentWidth(mirrorRef.current.offsetWidth);
        });
        return () => { cancelled = true; };
    }, []);

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
        // A label, so a tap anywhere in the field lands on the input — the
        // pencil included.
        <label className="group flex items-center gap-2 p-4 px-3 border-2 border-gray-100 rounded-2xl bg-gray-50 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            {/* The value and its unit travel together; the pencil stays pinned
                to the right edge, so the empty space falls between them. */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {(currency || prefix) && (
                    <span className="text-2xl font-bold text-gray-400 shrink-0">{prefix ?? "Rp"}</span>
                )}
                <input
                    type="text"
                    inputMode="numeric"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={placeholder}
                    style={contentWidth !== null ? { width: contentWidth } : undefined}
                    className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent max-w-full min-w-0 shrink"
                />
                <span
                    ref={mirrorRef}
                    aria-hidden
                    className="absolute -left-[9999px] top-0 whitespace-pre text-2xl font-bold pointer-events-none"
                >
                    {localValue || placeholder}
                </span>
                {unit && (
                    <span className="text-2xl font-bold text-gray-400 shrink-0">{unit}</span>
                )}
            </div>
            {/* A filled field reads as a display tile — the number is already
                there, so nothing says it can be changed. An empty one shows a
                placeholder and needs no hint, so the pencil only appears once
                there is a value to overwrite — and once the field has focus the
                hint has done its job, so it goes away. */}
            {localValue !== "" && (
                <Pencil size={20} strokeWidth={2.5} className="text-gray-400 shrink-0 group-focus-within:hidden" />
            )}
        </label>
    );
}
