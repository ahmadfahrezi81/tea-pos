"use client";

import { usePathname, useParams } from "next/navigation";
import { navigation } from "@tea-pos/utils/navigation";
import { useT } from "@/lib/hooks/useT";

export function PillSwitcher() {
    const pathname = usePathname();
    const { tenantSlug } = useParams<{ tenantSlug: string }>();
    const t = useT();

    const base = `/${tenantSlug}/mobile/home/pos`;

    const tabs = [
        { label: t("nav.pos"), href: base },
        { label: t("nav.manage"), href: `/${tenantSlug}/mobile/home/manage` },
    ];

    const isActive = (href: string) =>
        href === base ? pathname === base : pathname.startsWith(href);

    return (
        <div className="flex items-center bg-slate-200 rounded-xl p-1 self-start">
            {/* Through the shell rather than <Link>, which runs its own
                transition the shell cannot see — so this switch showed no
                navigation bar while every other one did. */}
            {tabs.map((tab) => (
                <button
                    key={tab.href}
                    type="button"
                    onClick={() => navigation.push(tab.href)}
                    className={`px-3.5 py-0.5 rounded-lg text-lg font-semibold transition-all duration-200 ${
                        isActive(tab.href)
                            ? "bg-white text-slate-950"
                            : "text-slate-600"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
