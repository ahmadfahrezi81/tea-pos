"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

export function PillSwitcher() {
    const pathname = usePathname();
    const { tenantSlug } = useParams<{ tenantSlug: string }>();

    const base = `/${tenantSlug}/mobile/home/pos`;

    const tabs = [
        { label: "POS", href: base },
        { label: "Manage", href: `/${tenantSlug}/mobile/home/manage` },
    ];

    const isActive = (href: string) =>
        href === base ? pathname === base : pathname.startsWith(href);

    return (
        <div className="flex items-center bg-slate-200 rounded-xl p-1 self-start">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3.5 py-0.5 rounded-lg text-lg font-semibold transition-all duration-200 ${
                        isActive(tab.href)
                            ? "bg-white text-slate-950"
                            : "text-slate-600"
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
