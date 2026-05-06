"use client";

import React from "react";
import { usePathname } from "next/navigation";

const Page = () => {
    const pathname = usePathname();

    return (
        <main className="flex items-center justify-center h-screen flex-col font-sans">
            <p className="text-lg">
                Current Route: <strong>{pathname}</strong>
            </p>
        </main>
    );
};

export default Page;
