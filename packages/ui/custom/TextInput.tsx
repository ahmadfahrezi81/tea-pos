"use client";

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

export function TextInput({ value, onChange, placeholder, type = "text", className = "text-2xl font-bold", inputMode }: TextInputProps) {
    return (
        <div className="flex items-center gap-2 p-4 px-3 border border-gray-100 rounded-2xl bg-gray-50">
            <input
                type={type}
                inputMode={inputMode}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${className} text-gray-900 border-none outline-none bg-transparent w-full min-w-0 placeholder:text-gray-300`}
            />
        </div>
    );
}
