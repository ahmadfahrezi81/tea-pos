"use client";

import { usePathname } from "next/navigation";
import { AtAGlance } from "./_components/AtAGlance";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isPos = pathname.endsWith("/home/pos");
    const isManage = pathname.endsWith("/home/manage");
    const isHomeRoot = isPos || isManage;

    return (
        <div className="flex flex-col gap-4">
            {isHomeRoot && <AtAGlance />}
            <div
                key={pathname}
                className="animate-in fade-in duration-150 ease-out"
            >
                {children}
            </div>
        </div>
    );
}
