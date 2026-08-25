"use client";

import { Pencil } from "lucide-react";

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    /**
     * Which on-screen keyboard to raise. "numeric" is for digit strings that
     * are not quantities — account numbers, reference codes — where the value
     * has to stay text so leading zeros and long digit runs survive.
     */
    inputMode?: "text" | "numeric" | "tel" | "decimal" | "email" | "search" | "url";
}

export function TextInput({ value, onChange, placeholder, type = "text", className = "text-xl font-bold", inputMode }: TextInputProps) {
    return (
        // A label, so a tap anywhere in the field lands on the input — the
        // pencil included. Same chrome as NumberInput: the two sit next to each
        // other on most forms and must not read as different kinds of control.
        <label className="group flex items-center gap-2 p-4 px-3 border-2 border-gray-100 rounded-2xl bg-gray-50 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <input
                type={type}
                inputMode={inputMode}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${className} text-gray-900 border-none outline-none bg-transparent w-full min-w-0 placeholder:text-gray-300`}
            />
            {/* A filled field reads as a display tile — the text is already
                there, so nothing says it can be changed. An empty one shows a
                placeholder and needs no hint, so the pencil only appears once
                there is a value to overwrite — and once the field has focus the
                hint has done its job, so it goes away. */}
            {value !== "" && (
                <Pencil size={20} strokeWidth={2.5} className="text-gray-400 shrink-0 group-focus-within:hidden" />
            )}
        </label>
    );
}
