"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { t, type Locale } from "@tea-pos/utils/translations";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "./AuthContext";

interface LanguageContextType {
    language: Locale;
    setLanguage: (lang: Locale) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
    children,
    initialLocale,
}: {
    children: React.ReactNode;
    initialLocale?: Locale;
}) {
    const { user } = useAuth();
    const [language, setLanguageState] = useState<Locale>(
        initialLocale ?? "en",
    );

    // On first load without a cookie, sync from DB once user is available
    useEffect(() => {
        if (!initialLocale && user?.preferredLanguage) {
            const lang = user.preferredLanguage as Locale;
            setLanguageState(lang);
            document.cookie = `locale=${lang}; path=/; max-age=31536000`;
        }
    // Only run once when user first loads — intentionally exclude initialLocale
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.preferredLanguage]);

    function setLanguage(lang: Locale) {
        setLanguageState(lang);
        document.cookie = `locale=${lang}; path=/; max-age=31536000`;
        usersApi.updateLanguage({ language: lang }).catch(() => {});
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t: (key) => t(language, key) }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
    return context;
}
