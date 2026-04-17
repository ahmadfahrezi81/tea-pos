"use client";
// app/mobile/chart/page.tsx
import dynamic from "next/dynamic";

const MobileHourlySales = dynamic(
    () => import("./_components/MobileHourlySales"),
    {
        ssr: false,
        loading: () => (
            <div className="h-64 animate-pulse bg-gray-100 rounded-xl m-4" />
        ),
    },
);

export default function ChartPage() {
    return <MobileHourlySales />;
}
