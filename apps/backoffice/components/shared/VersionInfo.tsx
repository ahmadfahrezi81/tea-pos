"use client";

export default function VersionInfo() {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    return <span className="font-mono text-base opacity-90">v{version}</span>;
}
