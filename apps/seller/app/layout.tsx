import "./globals.css";
import { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/context/AuthContext";
import { LanguageProvider } from "@/lib/context/LanguageContext";
import type { Locale } from "@tea-pos/utils/translations";

/**
 * system-ui resolves to a different typeface on every platform — San Francisco
 * on iOS, Roboto on stock Android, One UI Sans on Samsung — so the same screen
 * has different letterforms and metrics on each device. Inter is self-hosted by
 * next/font, so it also works offline, which matters for an installed PWA.
 */
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

/** slate-100 — the header and the top of the shell gradient. */
const SHELL_TOP_COLOR = "#f1f5f9";

export const viewport: Viewport = {
    // Tints the status bar to match the header underneath it, instead of
    // leaving a white strip above a slate header.
    themeColor: [
        { color: SHELL_TOP_COLOR, media: "(prefers-color-scheme: light)" },
        { color: SHELL_TOP_COLOR, media: "(prefers-color-scheme: dark)" },
    ],
    // Draw into the notch/home-indicator area. Safe: the mobile shell's header
    // and footer apply env(safe-area-inset-*) themselves, and because they are
    // in the flex flow the content region shrinks by exactly those insets.
    viewportFit: "cover",
    // Android: resize the layout when the soft keyboard opens so footer CTAs
    // stay reachable instead of being covered. Safari ignores this.
    interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
    title: "Tea POS",
    description: "Point of Sale System",
    manifest: "/manifest.json",
    icons: {
        icon: [
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/icon-512x512.png" }],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Tea POS",
    },
    other: {
        "mobile-web-app-capable": "yes",
        // The app ships its own en/id translations. Browser auto-translate
        // rewrites text nodes under React, which breaks layout and can crash
        // reconciliation with removeChild errors.
        google: "notranslate",
    },
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("x-user-info");
    let initialUser = null;
    try {
        initialUser = userCookie?.value ? JSON.parse(userCookie.value) : null;
    } catch {
        initialUser = null;
    }
    const localeCookie = cookieStore.get("locale")?.value;
    const resolvedLocale = localeCookie ?? initialUser?.preferredLanguage;
    const initialLocale: Locale | undefined =
        resolvedLocale === "en" || resolvedLocale === "id" ? resolvedLocale : undefined;

    return (
        <html
            lang={initialLocale ?? "en"}
            translate="no"
            className={`${inter.variable} notranslate`}
            suppressHydrationWarning
        >
            <body>
                <SWRConfig
                    value={{ dedupingInterval: 5000, revalidateOnFocus: false, errorRetryCount: 3 }}
                >
                    <AuthProvider initialUser={initialUser}>
                        <LanguageProvider initialLocale={initialLocale}>
                            {children}
                            <Analytics />
                        </LanguageProvider>
                    </AuthProvider>
                </SWRConfig>
            </body>
        </html>
    );
}
