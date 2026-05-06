import "./globals.css";
import { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/context/AuthContext";
import { FeaturesProvider } from "@/lib/context/features-provider";

export const viewport: Viewport = {
    themeColor: [
        { color: "#ffffff", media: "(prefers-color-scheme: light)" },
        { color: "#ffffff", media: "(prefers-color-scheme: dark)" },
    ],
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

    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <SWRConfig
                    value={{ dedupingInterval: 5000, revalidateOnFocus: false }}
                >
                    <FeaturesProvider>
                        <AuthProvider initialUser={initialUser}>
                            {children}
                            <Analytics />
                        </AuthProvider>
                    </FeaturesProvider>
                </SWRConfig>
            </body>
        </html>
    );
}
