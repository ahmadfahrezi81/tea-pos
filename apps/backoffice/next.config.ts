import type { NextConfig } from "next";
import { version } from "./package.json";
import withPWAInit from "@ducanh2912/next-pwa";

/**
 * Changes on every deploy, which `version` does not — it is bumped by hand per
 * release, so two deploys of one release share it. Used only to tell whether
 * the JS a device is running predates the build now being served. Falls back to
 * the release number for local production builds, where there is no deploy to
 * identify.
 */
const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || version;

const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: false,
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
                    cacheName: `bo-next-data-${version}`,
                    expiration: { maxEntries: 32, maxAgeSeconds: 60 * 5 },
                    networkTimeoutSeconds: 3,
                },
            },
            {
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: `bo-supabase-api-${version}`,
                    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                    networkTimeoutSeconds: 5,
                },
            },
        ],
    },
});

const nextConfig: NextConfig = {
    reactCompiler: true,
    turbopack: {},
    allowedDevOrigins: ["busked-florentina-ducally.ngrok-free.dev"],
    env: {
        NEXT_PUBLIC_APP_VERSION: version,
        NEXT_PUBLIC_BUILD_ID: buildId,
    },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "i.ibb.co.com" },
            { protocol: "https", hostname: "i.ibb.co" },
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
        ],
    },
    transpilePackages: [
        "@tea-pos/shell",
        "@tea-pos/ui",
        "@tea-pos/db",
        "@tea-pos/features",
        "@tea-pos/services",
        "@tea-pos/utils",
    ],
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
                ],
            },
        ];
    },
};

export default process.env.NODE_ENV === "development"
    ? nextConfig
    : withPWA(nextConfig as Parameters<typeof withPWA>[0]);
