import { useLanguage } from "@/lib/context/LanguageContext";

export function useT() {
    const { t } = useLanguage();
    return t;
}
