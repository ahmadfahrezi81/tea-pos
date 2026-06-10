"use client";

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
}

export function TextInput({ value, onChange, placeholder, type = "text", className = "text-2xl font-bold" }: TextInputProps) {
    return (
        <div className="flex items-center gap-2 p-4 px-3 border border-gray-100 rounded-2xl bg-gray-50">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${className} text-gray-900 border-none outline-none bg-transparent w-full min-w-0 placeholder:text-gray-300`}
            />
        </div>
    );
}
