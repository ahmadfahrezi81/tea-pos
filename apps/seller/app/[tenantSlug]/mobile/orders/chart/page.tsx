"use client";
// app/mobile/chart/page.tsx
import dynamic from "next/dynamic";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

const DailyChart = dynamic(
    () => import("./_components/DailyChart"),
    {
        ssr: false,
        loading: () => (
            <Skeleton className="h-64 rounded-xl m-4" />
        ),
    },
);

export default function ChartPage() {
    return <DailyChart />;
}
