interface Option {
    value: string;
    label: string;
}

interface SelectInputProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    otherTriggerValue?: string;
    otherValue?: string;
    onOtherChange?: (value: string) => void;
    otherPlaceholder?: string;
}

export function SelectInput({
    options,
    value,
    onChange,
    placeholder,
    otherTriggerValue,
    otherValue,
    onOtherChange,
    otherPlaceholder = "Describe...",
}: SelectInputProps) {
    const showOther = !!otherTriggerValue && value === otherTriggerValue;

    return (
        <div className="flex flex-col gap-2">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {showOther && (
                <input
                    type="text"
                    value={otherValue ?? ""}
                    onChange={(e) => onOtherChange?.(e.target.value)}
                    placeholder={otherPlaceholder}
                    className="w-full p-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            )}
        </div>
    );
}
