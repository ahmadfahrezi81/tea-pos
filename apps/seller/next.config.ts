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
    /* The start URL is now `/launch.html` — a static file with nothing
       user-specific in it, so it can be served straight from the precache.
       Left true, next-pwa treats the start URL as auth-dependent and caches it
       NetworkFirst, which makes a cold launch wait on the network by design. */
    dynamicStartUrl: false,
    workboxOptions: {
        disableDevLogs: true,
        /* next-pwa globs `public/` by extension and HTML is not on the list —
           verified by reading the generated `public/sw.js`, where every other
           file in `public/` appears and `launch.html` did not. Precaching it is
           the whole point of the file, so it is named explicitly here.

           Revision is the build id, so a deploy replaces it rather than leaving
           a device on an old copy. */
        additionalManifestEntries: [{ url: "/launch.html", revision: buildId }],
        runtimeCaching: [
            {
                urlPattern: /\/_next\/data\/.*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: `next-data-${version}`,
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
                    cacheName: `supabase-api-${version}`,
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
                    cacheName: `product-images-${version}`,
                    expiration: {
                        maxEntries: 200,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                    },
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
            {
                protocol: "https",
                hostname: "i.ibb.co.com",
            },
            {
                protocol: "https",
                hostname: "i.ibb.co",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
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

export default process.env.NODE_ENV === "development"
    ? nextConfig
    : withPWA(nextConfig as Parameters<typeof withPWA>[0]);
