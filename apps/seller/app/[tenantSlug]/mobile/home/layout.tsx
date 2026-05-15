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
    const sectionLabel = isPos ? "POS" : isManage ? "Manage" : null;

    return (
        <div className="flex flex-col gap-4">
            {isHomeRoot && <AtAGlance />}
            {sectionLabel && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-0.5 bg-slate-400 rounded-full" />
                    <span className="text-sm font-semibold text-slate-800 uppercase tracking-widest shrink-0">
                        {sectionLabel}
                    </span>
                    <div className="flex-1 h-0.5 bg-slate-400 rounded-full" />
                </div>
            )}
            <div
                key={pathname}
                className="animate-in fade-in duration-150 ease-out"
            >
                {children}
            </div>
        </div>
    );
}
