"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function DateTimeDisplay() {
    const [dateTime, setDateTime] = React.useState<Date | null>(null);

    React.useEffect(() => {
        // Client-only render to avoid SSR mismatch
        setDateTime(new Date());
        const interval = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!dateTime) return null;

    const locale = navigator.language || "en-US";

    const formattedDate = dateTime
        .toLocaleDateString(locale, {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        })
        .replace(/\//g, ".")
        .replace(",", "");

    const formattedTime = dateTime.toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground font-mono">
            <Calendar className="h-4 w-4 text-muted-foreground/80 mb-0.5" />
            <div className="flex items-center gap-2 font-medium tracking-tight text-foreground/80">
                <span>{formattedDate}</span>
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                />
                <span>{formattedTime}</span>
            </div>
        </div>
    );
}
