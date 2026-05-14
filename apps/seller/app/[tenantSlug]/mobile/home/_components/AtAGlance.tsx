"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { PillSwitcher } from "./PillSwitcher";

interface AtAGlanceProps {
    title?: string;
}

export function AtAGlance({ title }: AtAGlanceProps) {
    const heading = useMemo(() => {
        if (title) return title;
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    }, [title]);

    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xl font-bold text-gray-900">{heading}</p>
                <p className="text-base font-medium text-gray-600">
                    {format(new Date(), "EE, dd MMMM")}
                </p>
            </div>
            <PillSwitcher />
        </div>
    );
}
