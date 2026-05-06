"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

export function PillSwitcher() {
    const pathname = usePathname();
    const { tenantSlug } = useParams<{ tenantSlug: string }>();

    const base = `/${tenantSlug}/mobile/pos`;

    const tabs = [
        { label: "Sell", href: base },
        { label: "Manage", href: `${base}/manage` },
    ];

    const isActive = (href: string) =>
        href === base ? pathname === base : pathname.startsWith(href);

    return (
        <div className="flex items-center bg-gray-100 rounded-full p-1 self-start">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                        isActive(tab.href)
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500"
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
