import type { NextConfig } from "next";
import { version } from "./package.json";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    cacheStartUrl: true,
    dynamicStartUrl: true,
    workboxOptions: {
        disableDevLogs: true,
        runtimeCaching: [
            {
                urlPattern: /\/_next\/data\/.*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: "next-data",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 60 * 5,
                    },
                    networkTimeoutSeconds: 3,
                },
            },
            {
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: "supabase-api",
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 5,
                    },
                    networkTimeoutSeconds: 5,
                },
            },
            {
                urlPattern: /^https:\/\/i\.ibb\.co\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "product-images",
                    expiration: {
                        maxEntries: 200,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                    },
                },
            },
            {
                urlPattern: /\/_next\/static\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "next-static",
                    expiration: {
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                    },
                },
            },
        ],
    },
});

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: version,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "i.ibb.co.com",
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: "/docs",
                destination: "/api/docs/ui",
            },
        ];
    },
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

export default withPWA(nextConfig);
