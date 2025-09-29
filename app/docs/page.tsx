/* eslint-disable @typescript-eslint/ban-ts-comment */
// app/docs/page.tsx - Simple docs UI page
"use client";

import { useEffect } from "react";

export default function DocsPage() {
    useEffect(() => {
        // Dynamically load Swagger UI
        const script = document.createElement("script");
        script.src =
            "https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js";
        script.onload = () => {
            // @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            window.SwaggerUIBundle({
                url: "/api/docs",
                dom_id: "#swagger-ui",
                presets: [
                    // @ts-ignore
                    SwaggerUIBundle.presets.apis,
                    // @ts-ignore
                    SwaggerUIBundle.presets.standalone,
                ],
            });
        };
        document.head.appendChild(script);

        // Load CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css";
        document.head.appendChild(link);
    }, []);

    return (
        <div>
            <h1 style={{ padding: "20px" }}>API Documentation</h1>
            <div id="swagger-ui"></div>
        </div>
    );
}
