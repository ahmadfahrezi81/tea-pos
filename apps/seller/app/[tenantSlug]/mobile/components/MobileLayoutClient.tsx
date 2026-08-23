"use client";
import { ReactNode, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronsUpDown } from "lucide-react";
import { MobileShell } from "@tea-pos/shell/MobileShell";
import { useStores } from "@/lib/hooks/stores/useStores";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import { StorePickerDrawer } from "./StorePickerDrawer";
import { navigation } from "@tea-pos/utils/navigation";
import { prefetchSuffixes, resolveRoute, rootTabSuffixes, tabGroups } from "../config/navigation";
import { useFlags } from "@/lib/context/FlagsContext";
import { useT } from "@/lib/hooks/useT";

interface MobileLayoutClientProps {
    children: ReactNode;
}

export default function MobileLayoutClient({ children }: MobileLayoutClientProps) {
    const { url } = useTenantSlug();
    const t = useT();

    const [shellReady, setShellReady] = useState(false);
    const { user, avatarUrl, mutate: refreshProfile } = useAuth();
    const {
        flags: { isMaintenanceEnabled },
    } = useFlags();
    const { data: storesData } = useStores();
    const { selectedStore, setIsPickerOpen } = useStore();

    // Latches on: once the shell has been ready it never reverts, so a later
    // auth failure surfaces the auth overlay rather than the loading screen.
    // Set during render rather than in an effect — the guard makes it converge
    // in one pass and avoids a second commit on every boot.

    if (!shellReady && user && storesData !== undefined) {
        setShellReady(true);
    }

    const rootTabPaths = useMemo(() => rootTabSuffixes.map(url), [url]);
    const prefetchPaths = useMemo(() => prefetchSuffixes.map(url), [url]);

    // Labels are translated here; which variant applies is path-dependent and so
    // is resolved by the shell, which knows where we are navigating to.
    const tabs = useMemo(
        () =>
            tabGroups.global.map((tab) => ({
                path: url(tab.pathSuffix),
                label: t(tab.labelKey),
                icon: tab.icon,
                matchPaths: tab.matchSuffixes.map(url),
                variant: tab.variant && {
                    pathContains: tab.variant.pathContains,
                    label: t(tab.variant.labelKey),
                    icon: tab.variant.icon,
                },
            })),
        [url, t],
    );

    const registerNavigate = useCallback((navigate: (path: string) => void) => {
        navigation.register(navigate);
    }, []);

    const registerReplace = useCallback((replace: (path: string) => void) => {
        navigation.registerReplace(replace);
    }, []);

    const onAccount = useCallback(() => {
        navigation.push(url("/mobile/account"));
    }, [url]);

    return (
        <MobileShell
            resolveRoute={resolveRoute}
            rootTabPaths={rootTabPaths}
            tabs={tabs}
            homePath={url("/mobile")}
            toPath={url}
            t={t}
            titleAccessory={
                selectedStore ? (
                    <button
                        onClick={() => setIsPickerOpen(true)}
                        className="flex items-center gap-0.5 active:scale-95"
                    >
                        <span className="text-[22px] font-semibold tracking-tight text-brand">
                            {selectedStore.name}
                        </span>
                        <ChevronsUpDown size={18} strokeWidth={3} className="text-brand" />
                    </button>
                ) : null
            }
            avatarUrl={avatarUrl}
            onAccount={onAccount}
            ready={shellReady}
            prefetchPaths={prefetchPaths}
            onNavigate={registerNavigate}
            onReplace={registerReplace}
            extras={<StorePickerDrawer />}
            overlay={
                <>
                    {/* Loader — covers the shell until bootstrap data arrives. */}
                    {!shellReady && (
                        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
                            <div className="text-center" role="status" aria-live="polite">
                                <div className="mb-8">
                                    <Image
                                        src="/icons/icon-192x192.png"
                                        alt="Logo"
                                        width={70}
                                        height={70}
                                        priority
                                        className="rounded-xl shadow-2xl mx-auto"
                                    />
                                </div>
                                <div className="w-64 h-4 loading-track">
                                    <div className="loading-bar">
                                        <div className="absolute top-0 left-0 right-0 h-1/2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                                    </div>
                                </div>
                                <div className="mt-4 text-xs text-gray-600 text-center">
                                    <span className="font-mono text-xs opacity-90">Loading ...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMaintenanceEnabled && (
                        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
                            <div className="text-center">
                                <div className="mb-6">
                                    <Image
                                        src="/icons/icon-192x192.png"
                                        alt="Logo"
                                        width={70}
                                        height={70}
                                        priority
                                        className="rounded-xl shadow-2xl mx-auto"
                                    />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                                    Under Maintenance
                                </h2>
                                <p className="text-gray-500 text-sm max-w-xs">
                                    We&apos;re making some updates to improve your experience.
                                    We&apos;ll be back shortly.
                                </p>
                            </div>
                        </div>
                    )}

                    {shellReady && !user && (
                        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
                            <div className="text-center">
                                <div className="mb-6">
                                    <Image
                                        src="/icons/icon-192x192.png"
                                        alt="Logo"
                                        width={70}
                                        height={70}
                                        priority
                                        className="rounded-xl shadow-2xl mx-auto"
                                    />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                                    Authentication Required
                                </h2>
                                <p className="text-gray-600 mb-6 text-sm">
                                    Unable to load your profile. Please check your connection and
                                    try again.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium"
                                    >
                                        Refresh Page
                                    </button>
                                    <button
                                        onClick={() => refreshProfile()}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            }
        >
            {children}
        </MobileShell>
    );
}
