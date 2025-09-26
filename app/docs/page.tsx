"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically import to avoid SSR issues
const RedocStandalone = dynamic(
    () => import("redoc").then((mod) => mod.RedocStandalone),
    { ssr: false }
);

export default function DocsPage() {
    return (
        <div className="w-full h-screen">
            <RedocStandalone
                specUrl="/api/openapi"
                options={{
                    theme: { colors: { primary: { main: "#0070f3" } } },
                    hideDownloadButton: false,
                    nativeScrollbars: true,
                }}
            />
        </div>
    );
}
