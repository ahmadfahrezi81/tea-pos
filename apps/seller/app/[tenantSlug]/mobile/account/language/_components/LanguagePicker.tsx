"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import type { Locale } from "@tea-pos/utils/translations";

const LANGUAGES: { locale: Locale; label: string; sublabel: string }[] = [
    { locale: "en", label: "English", sublabel: "English" },
    { locale: "id", label: "Bahasa Indonesia", sublabel: "Indonesian" },
];

export default function LanguagePicker() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="bg-white rounded-2xl px-4 py-1">
            {LANGUAGES.map(({ locale, label, sublabel }) => {
                const isSelected = language === locale;
                return (
                    <button
                        key={locale}
                        onClick={() => setLanguage(locale)}
                        className="w-full flex items-center justify-between py-5 border-b last:border-b-0 border-slate-100 active:bg-gray-50"
                    >
                        <div className="text-left">
                            <p className="text-[17px] font-medium text-gray-900">{label}</p>
                            <p className="text-sm text-gray-400">{sublabel}</p>
                        </div>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-brand/90 bg-brand/90" : "border-gray-300"}`}>
                            {isSelected && <Check size={16} className="text-white" strokeWidth={4} />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
