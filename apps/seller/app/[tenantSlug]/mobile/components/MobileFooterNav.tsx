"use client";
import type { LucideIcon } from "lucide-react";

export interface Tab {
    path: string;
    label: string;
    icon: LucideIcon;
    matchPaths: string[];
}

interface MobileFooterNavProps {
    tabs: Tab[];
    currentPath: string;
    onTabClick: (path: string) => void;
    isIPhonePWA: boolean;
    storesReady: boolean;
}

export function MobileFooterNav({
    tabs,
    currentPath,
    onTabClick,
    isIPhonePWA,
    storesReady,
}: MobileFooterNavProps) {
    const wrapperClass = `flex ${isIPhonePWA ? "pb-8" : ""}`;

    if (!storesReady) return null;

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
            <div className={wrapperClass}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.matchPaths.includes(currentPath);
                    return (
                        <button
                            key={tab.path}
                            onClick={() => onTabClick(tab.path)}
                            className={`flex-1 py-3 px-4 pb-2 flex flex-col items-center space-y-1 relative transition-all duration-75 active:scale-98 ${
                                isActive
                                    ? "text-brand bg-brand/5"
                                    : "text-gray-600 hover:text-brand"
                            }`}
                        >
                            <Icon
                                size={24}
                                className="transition-transform duration-75"
                            />
                            <span className="text-xs font-medium transition-transform duration-75">
                                {tab.label}
                            </span>
                            {isActive && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-brand rounded-b-full transition-all duration-200" />
                            )}
                        </button>
                    );
                })}
            </div>
        </footer>
    );
}
