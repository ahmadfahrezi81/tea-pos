// components/shared/VersionInfo.tsx
"use client";
import { useEffect, useState } from "react";

export default function VersionInfo() {
    const [backend, setBackend] = useState<string | null>(null);
    const frontend = process.env.NEXT_PUBLIC_APP_VERSION;

    useEffect(() => {
        fetch("/api/version")
            .then((r) => r.json())
            .then((d) => setBackend(d.backendVersion))
            .catch(() => setBackend("error"));
    }, []);

    return (
        <span className="font-mono text-xs opacity-90">
            v{frontend} ({backend === null ? "loading..." : backend})
        </span>
    );
}
