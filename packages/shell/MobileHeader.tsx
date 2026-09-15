"use client";
import { ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, X, UserCircle, Plus, Pencil } from "lucide-react";
import type { RouteConfig } from "./routes";

interface MobileHeaderProps {
    route: RouteConfig | null;
    title: string;
    isSubPage: boolean;
    /** Rendered beside the title on routes that set `titleAccessory`. */
    titleAccessory?: ReactNode;
    avatarUrl: string | null;
    showAccountIcon: boolean;
    onBack: () => void;
    onAccount: () => void;
    onHeaderAction: () => void;
}

export function MobileHeader({
    route,
    title,
    isSubPage,
    titleAccessory,
    avatarUrl,
    showAccountIcon,
    onBack,
    onAccount,
    onHeaderAction,
}: MobileHeaderProps) {
    const inlineHeader = route?.inlineHeader ?? false;
    const headerAction = route?.headerAction;
    const accessory = route?.titleAccessory ? titleAccessory : null;

    return (
        <header className="shrink-0 bg-slate-100 px-4 py-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
                {/* min-w-0 down the chain lets the title accessory truncate. A
                    flex child will not shrink below its content otherwise, so a
                    long store name wrapped the header onto a second line and
                    moved the page each time the store changed. */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {!isSubPage ? (
                        <div className="flex items-baseline gap-2 min-w-0">
                            <h1 className="shrink-0 text-3xl font-extrabold tracking-tight text-gray-900">
                                {title}
                            </h1>
                            {accessory}
                        </div>
                    ) : inlineHeader && headerAction ? (
                        <div className="flex flex-col gap-1.5 w-full">
                            <button
                                onClick={onBack}
                                className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                            >
                                <ArrowLeft size={30} strokeWidth={2.5} />
                            </button>
                            <div className="flex items-center justify-between">
                                <p className="text-2xl font-bold tracking-tight text-gray-900">
                                    {title}
                                </p>
                                <button
                                    onClick={onHeaderAction}
                                    className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center text-white active:scale-95"
                                    aria-label={headerAction === "edit" ? "Edit" : "Add"}
                                >
                                    {headerAction === "edit" ? (
                                        <Pencil size={22} strokeWidth={2.5} />
                                    ) : (
                                        <Plus size={30} strokeWidth={2.5} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : inlineHeader ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onBack}
                                className="text-gray-900 active:scale-95 pr-2 pl-0 py-1"
                            >
                                <X size={30} strokeWidth={2.5} />
                            </button>
                            <p className="text-2xl font-bold tracking-tight text-gray-900">
                                {title}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 min-w-0">
                            <button
                                onClick={onBack}
                                className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                            >
                                <ArrowLeft size={30} strokeWidth={2.5} />
                            </button>
                            <div className="flex items-center gap-2 min-w-0">
                                <p
                                    className={`text-2xl tracking-tight text-gray-900 ${
                                        accessory ? "shrink-0 font-semibold" : "font-bold"
                                    }`}
                                >
                                    {title}
                                </p>
                                {accessory}
                            </div>
                        </div>
                    )}
                </div>

                {showAccountIcon && (
                    <button onClick={onAccount} className="shrink-0 active:scale-95" aria-label="Account">
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
                                <UserCircle size={25} className="text-gray-600" />
                            </div>
                        )}
                    </button>
                )}
            </div>
        </header>
    );
}
