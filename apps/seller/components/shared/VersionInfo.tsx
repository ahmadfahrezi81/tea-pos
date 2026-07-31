// components/shared/VersionInfo.tsx
"use client";
export default function VersionInfo() {
    const frontend = process.env.NEXT_PUBLIC_APP_VERSION;

    // Only the frontend version is rendered. The component also fetched
    // /api/version into state that nothing read — a request on every mount for
    // a value that never reached the DOM — so the fetch went with it.
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 font-mono text-xs text-gray-700">
            Version: v{frontend}
        </span>
    );
}
