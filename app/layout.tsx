import "./globals.css";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/client/context/AuthContext";
import { FeaturesProvider } from "@/lib/client/context/features-provider";

export const metadata: Metadata = {
    title: "Tea POS",
    description: "Point of Sale System",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Tea POS",
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
            <head>
                <meta
                    name="theme-color"
                    content="#F9FAFB"
                    media="(prefers-color-scheme: light)"
                />
                <meta
                    name="theme-color"
                    content="#F9FAFB"
                    media="(prefers-color-scheme: dark)"
                />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="default"
                />
                <meta name="apple-mobile-web-app-title" content="Tea POS" />
                <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
                <link
                    rel="preconnect"
                    href="https://urzoiliisayupuvmaris.supabase.co"
                />
                <link
                    rel="dns-prefetch"
                    href="https://urzoiliisayupuvmaris.supabase.co"
                />
            </head>
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
