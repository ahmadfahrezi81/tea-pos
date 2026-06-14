import { en } from "./en";
import { id } from "./id";

export type Locale = "en" | "id";

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : string;
};

const messages = { en, id };

export function t(locale: Locale, key: string): string {
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = messages[locale];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = en;
    for (const k of keys) {
        val = val?.[k];
        fallback = fallback?.[k];
    }
    return (typeof val === "string" ? val : fallback) ?? key;
}
