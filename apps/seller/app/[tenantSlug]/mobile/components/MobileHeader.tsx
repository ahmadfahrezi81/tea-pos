"use client";
import { ArrowLeft, ChevronsUpDown, UserCircle, Plus } from "lucide-react";
import Image from "next/image";
import { resolveRoute } from "../config/navigation";
import { navigation } from "@tea-pos/utils/navigation";

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
    const currentRoute = resolveRoute(currentPath);
    const isInlineHeader = currentRoute?.inlineHeader ?? false;
    const isChart = currentRoute?.isChart ?? false;
    const headerAction = currentRoute?.headerAction;

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-slate-100 p-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    {isSubPage ? (
                        isInlineHeader ? (
                            headerAction === "add" ? (
                                <div className="flex flex-col gap-1.5 w-full">
                                    <button
                                        onClick={onBack}
                                        className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                                    >
                                        <ArrowLeft size={28} strokeWidth={2} />
                                    </button>
                                    <div className="flex items-center justify-between">
                                        <p className="text-2xl font-bold tracking-tight text-gray-900">
                                            {currentTitle}
                                        </p>
                                        <button
                                            onClick={() => navigation.push(`${currentPath}/add`)}
                                            className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-brand active:scale-95"
                                            aria-label="Add"
                                        >
                                            <Plus size={32} strokeWidth={3.5} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
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
                            )
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
                                <p className="text-2xl font-bold tracking-tight text-gray-900">
                                    {currentTitle}
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                                {currentTitle}
                            </h1>
                            {selectedStore && (
                                <button
                                    onClick={onStorePicker}
                                    className="flex items-center gap-0.5 active:scale-95"
                                >
                                    <span className="text-[22px] font-semibold tracking-tight text-brand">
                                        {selectedStore.name}
                                    </span>
                                    <ChevronsUpDown
                                        size={18}
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
                        className="active:scale-95"
                        aria-label="Account"
                    >
                        {avatarUrl ? (
                            <div className="w-[42px] h-[42px] rounded-xl overflow-hidden ring-1 ring-black/10">
                                <Image
                                    src={avatarUrl}
                                    alt="Account"
                                    width={42}
                                    height={42}
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-[42px] h-[42px] rounded-xl bg-gray-100 ring-1 ring-black/10 flex items-center justify-center">
                                <UserCircle
                                    size={25}
                                    className="text-gray-600"
                                />
                            </div>
                        )}
                    </button>
                )}
            </div>
        </header>
    );
}
