"use client";

import { getWeekInfo } from "@tea-pos/utils/week";
import { useT } from "@/lib/hooks/useT";

/* The seller's home greeting, same copy and same shape: who is looking and
   when. Rendered client-side because the hour is the user's, not the server's —
   a server render would freeze whatever part of the day the page was built in. */

function formatDate(): string {
    return new Date().toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "long",
    });
}

function getGreetingKey(): "morning" | "afternoon" | "evening" {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
}

export default function Greeting() {
    const t = useT();

    return (
        <div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
                {t(`home.greeting.${getGreetingKey()}`)}
            </p>
            <p className="text-base text-gray-600">
                {getWeekInfo().label} · {formatDate()}
            </p>
        </div>
    );
}
