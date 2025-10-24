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

    // Helper function to format numbers with leading zeros
    const pad = (num: number): string => num.toString().padStart(2, "0");

    // Format date: DD.MM.YY
    const day = pad(dateTime.getDate());
    const month = pad(dateTime.getMonth() + 1);
    const year = pad(dateTime.getFullYear());

    // Get short day name (e.g. "Mon")
    const weekday = dateTime.toLocaleDateString(locale, { weekday: "short" });

    const formattedDate = `${weekday} ${day}.${month}.${year} `;

    // Format time
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
                    className="data-[orientation=vertical]:h-4"
                />
                <span>{formattedTime}</span>
            </div>
        </div>
    );
}
