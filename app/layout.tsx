import "./globals.css";
import { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/context/AuthContext";

export const metadata: Metadata = {
    title: "POS System",
    description: "Point of Sale System",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <SWRConfig
                    value={{
                        dedupingInterval: 5000,
                        revalidateOnFocus: false,
                    }}
                >
                    <AuthProvider>
                        {children}
                        <Analytics />
                    </AuthProvider>
                </SWRConfig>
            </body>
        </html>
    );
}
