import "./globals.css";
import { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/context/AuthContext";
import { FeaturesProvider } from "@/lib/context/features-provider";

export const viewport: Viewport = {
    themeColor: [
        { color: "#ffffff", media: "(prefers-color-scheme: light)" },
        { color: "#ffffff", media: "(prefers-color-scheme: dark)" },
    ],
    // Draw into the notch/home-indicator area. Safe now that the shell's header
    // and footer are in the flex flow and apply env(safe-area-inset-*)
    // themselves, so the content region shrinks by exactly those insets.
    viewportFit: "cover",
    // Android: resize the layout when the soft keyboard opens so footer CTAs
    // stay reachable instead of being covered. Safari ignores this.
    interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
    title: "Tea POS — Backoffice",
    description: "Backoffice Management",
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
        title: "Backoffice",
    },
    other: {
        // Browser auto-translate rewrites text nodes under React, which breaks
        // layout and can crash reconciliation with removeChild errors.
        "mobile-web-app-capable": "yes",
        google: "notranslate",
    },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("x-user-info");
    let initialUser = null;
    try {
        initialUser = userCookie?.value ? JSON.parse(userCookie.value) : null;
    } catch {
        initialUser = null;
    }

    return (
        <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
            <body>
                <SWRConfig value={{ dedupingInterval: 5000, revalidateOnFocus: false }}>
                    <FeaturesProvider>
                        <AuthProvider initialUser={initialUser}>
                            {children}
                        </AuthProvider>
                    </FeaturesProvider>
                </SWRConfig>
            </body>
        </html>
    );
}
