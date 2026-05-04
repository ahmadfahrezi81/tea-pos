"use client";
import { ArrowLeft, ChevronsUpDown, UserCircle } from "lucide-react";
import Image from "next/image";

interface MobileHeaderProps {
    currentPath: string;
    currentTitle: string | null;
    isSubPage: boolean;
    selectedStore: { id: string; name: string; status: string } | null;
    showAccountIcon: boolean;
    avatarUrl: string | null;
    onBack: () => void;
    onStorePicker: () => void;
    onAccount: () => void;
}

function isChartPage(path: string) {
    return (
        path.endsWith("/mobile/orders/chart") ||
        path.endsWith("/mobile/analytics/chart")
    );
}

function isInlineHeaderPage(path: string) {
    return path.endsWith("/mobile/analytics/daily/close");
}

export function MobileHeader({
    currentPath,
    currentTitle,
    isSubPage,
    selectedStore,
    showAccountIcon,
    avatarUrl,
    onBack,
    onStorePicker,
    onAccount,
}: MobileHeaderProps) {
    const isInlineHeader = isInlineHeaderPage(currentPath);
    const isChart = isChartPage(currentPath);

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-gray-50 p-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isSubPage ? (
                        isInlineHeader ? (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={onBack}
                                    className="text-gray-900 active:scale-95 pr-2 pl-0 py-1"
                                >
                                    <ArrowLeft size={28} strokeWidth={2} />
                                </button>
                                {currentTitle && (
                                    <p className="text-xl font-semibold tracking-tight text-gray-900">
                                        {currentTitle}
                                    </p>
                                )}
                            </div>
                        ) : isChart ? (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={onBack}
                                    className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                                >
                                    <ArrowLeft size={28} strokeWidth={2} />
                                </button>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-semibold tracking-tight text-gray-900">
                                        {currentTitle}
                                    </p>
                                    {selectedStore && (
                                        <button
                                            onClick={onStorePicker}
                                            className="flex items-center mt-1 gap-0.5 active:scale-95"
                                        >
                                            <p className="text-lg text-brand font-bold">
                                                {selectedStore.name}
                                            </p>
                                            <ChevronsUpDown
                                                size={14}
                                                strokeWidth={3}
                                                className="text-brand"
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={onBack}
                                    className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                                >
                                    <ArrowLeft size={28} strokeWidth={2} />
                                </button>
                                <p className="text-2xl font-semibold tracking-tight text-gray-900">
                                    {currentTitle}
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center gap-2">
                            <h1 className="text-[32px] font-bold tracking-tight text-gray-900">
                                {currentTitle}
                            </h1>
                            {selectedStore && (
                                <button
                                    onClick={onStorePicker}
                                    className="flex items-center mt-2 active:scale-98"
                                >
                                    <p className="text-xl font-semibold text-brand">
                                        {selectedStore.name}
                                    </p>
                                    <ChevronsUpDown
                                        size={16}
                                        strokeWidth={3}
                                        className="text-brand"
                                    />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {showAccountIcon && (
                    <button
                        onClick={onAccount}
                        className="p-1.5 rounded-xl active:scale-95"
                        aria-label="Account"
                    >
                        {avatarUrl ? (
                            <div className="rounded-full border-2 border-brand">
                                <Image
                                    src={avatarUrl}
                                    alt="Account"
                                    width={32}
                                    height={32}
                                    className="rounded-full object-cover"
                                />
                            </div>
                        ) : (
                            <UserCircle size={28} className="text-gray-700" />
                        )}
                    </button>
                )}
            </div>
        </header>
    );
}
