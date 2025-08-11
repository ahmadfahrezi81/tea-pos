import "./globals.css";
import { Metadata } from "next";

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
            <body>{children}</body>
        </html>
    );
}
