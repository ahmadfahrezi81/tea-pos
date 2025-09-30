import type { NextConfig } from "next";
import { version } from "./package.json"; // Make sure tsconfig allows JSON imports

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: version, // Expose version to frontend
    },
    /* config options here */
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "i.ibb.co.com",
            },
        ],
    },
    // ... your existing config
    async rewrites() {
        return [
            {
                source: "/docs",
                destination: "/api/docs/ui",
            },
        ];
    },
    // Optional: Add headers for better API handling
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
