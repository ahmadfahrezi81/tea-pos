// // app/mobile/MobileLayoutClient.tsx
// "use client";
// import { useEffect, ReactNode, useMemo, useState } from "react";
// import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
// import { useStores } from "@/lib/hooks/stores/useStores";
// import { format } from "date-fns";
// import Image from "next/image";
// import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
// import { useRouter, usePathname } from "next/navigation";
// import { useAuth } from "@/lib/context/AuthContext";
// import VersionInfo from "@/components/shared/VersionInfo";
// import { useTenantSlug } from "@/lib/tenant-url"; // ← Add this import

// export interface Assignment {
//     user_id: string;
//     role: string;
//     is_default: boolean;
// }

// export interface Assignments {
//     [storeId: string]: Assignment[];
// }

// interface MobileLayoutClientProps {
//     children: ReactNode;
// }

// export default function MobileLayoutClient({
//     children,
// }: MobileLayoutClientProps) {
//     const router = useRouter();
//     const pathname = usePathname();
//     const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
//     const { tenantSlug, url } = useTenantSlug(); // ← Add this hook

//     const { profile, isLoading: profileLoading } = useAuth();
//     const { data: storesData, isLoading: storesLoading } = useStores();

//     const user = useMemo(
//         () => (profile ? { id: profile.id } : null),
//         [profile]
//     );

//     const assignments = useMemo(
//         () => storesData?.assignments ?? {},
//         [storesData?.assignments]
//     );

//     const isLoading = profileLoading || (profile && storesLoading);

//     const canSell = useMemo(
//         () => !!user && hasSellerRole(user.id, assignments),
//         [user, assignments]
//     );

//     const canManage = useMemo(
//         () => !!user && hasManagerRole(user.id, assignments),
//         [user, assignments]
//     );

//     // Update tabs to use tenant-aware URLs
//     const tabs = useMemo(
//         () =>
//             [
//                 {
//                     path: url("/mobile/pos"), // ← Changed
//                     label: "POS",
//                     icon: ShoppingCart,
//                     show: canSell,
//                 },
//                 {
//                     path: url("/mobile/orders"), // ← Changed
//                     label: "Orders",
//                     icon: Clock,
//                     show: canSell || canManage,
//                 },
//                 {
//                     path: url("/mobile/analytics"), // ← Changed
//                     label: "Analytics",
//                     icon: BarChart3,
//                     show: canManage,
//                 },
//                 {
//                     path: url("/mobile/profile"), // ← Changed
//                     label: user ? "Profile" : "Login",
//                     icon: User,
//                     show: true,
//                 },
//             ].filter((tab) => tab.show),
//         [user, canSell, canManage, url] // ← Add url to dependencies
//     );

//     useEffect(() => {
//         tabs.forEach((tab) => {
//             router.prefetch(tab.path);
//         });
//     }, [tabs, router]);

//     useEffect(() => {
//         if (optimisticPath && pathname === optimisticPath) {
//             setOptimisticPath(null);
//         }
//     }, [pathname, optimisticPath]);

//     // Update role-based redirects with tenant URLs
//     // useEffect(() => {
//     //     if (isLoading) return;

//     //     if (!user && pathname !== url("/mobile/profile")) {
//     //         router.push(url("/mobile/profile")); // ← Changed
//     //         return;
//     //     }

//     //     if (pathname === url("/mobile/pos") && !canSell) {
//     //         router.push(url("/mobile/profile")); // ← Changed
//     //     }

//     //     if (pathname === url("/mobile/orders") && !(canSell || canManage)) {
//     //         router.push(url("/mobile/profile")); // ← Changed
//     //     }

//     //     if (pathname === url("/mobile/analytics") && !canManage) {
//     //         router.push(url("/mobile/profile")); // ← Changed
//     //     }
//     // }, [user, isLoading, pathname, canSell, canManage, router, url]); // ← Add url

//     // Only redirect if actively trying to access a restricted page
//     // useEffect(() => {
//     //     if (isLoading) return;

//     //     // Let middleware handle routing - only show error if needed
//     //     if (!user && pathname !== url("/mobile/profile")) {
//     //         // User not logged in accessing protected page
//     //         router.replace(url("/mobile/profile"));
//     //     }
//     // }, [user, isLoading, pathname, router, url]);

//     // useEffect(() => {
//     //     if (isLoading) return;

//     //     if (!user && pathname !== url("/mobile/profile")) {
//     //         router.replace(url("/mobile/profile"));
//     //     }
//     // }, [user, isLoading, pathname, router, url]);

//     useEffect(() => {
//         console.log("🔍 Layout Check:", {
//             isLoading,
//             user: !!user,
//             pathname,
//             canSell,
//             canManage,
//             assignments: Object.keys(assignments).length,
//         });

//         if (isLoading) return;

//         if (!user && pathname !== url("/mobile/profile")) {
//             console.log("❌ Redirecting: No user");
//             router.replace(url("/mobile/profile"));
//         }
//     }, [user, isLoading, pathname, router, url]);

//     if (isLoading) {
//         return (
//             <div className="h-[100dvh] overflow-hidden bg-white flex flex-col items-center justify-center">
//                 <div className="text-center" role="status" aria-live="polite">
//                     <div className="mb-8">
//                         <Image
//                             src="/LEMONI-512x512.png"
//                             alt="Logo"
//                             width={80}
//                             height={80}
//                             className="rounded-xl shadow-2xl mx-auto"
//                         />
//                     </div>

//                     <div className="w-64 h-1.5 loading-track rounded-full">
//                         <div className="loading-bar" />
//                     </div>

//                     <div className="mt-4 text-xs text-gray-600 text-center">
//                         <VersionInfo />
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     const currentPath = optimisticPath || pathname;

//     const getCurrentPageTitle = (path: string) => {
//         // Compare without tenant prefix
//         if (path.endsWith("/mobile/pos")) return "POS";
//         if (path.endsWith("/mobile/orders")) return "Orders";
//         if (path.endsWith("/mobile/analytics")) return "Analytics";
//         if (path.endsWith("/mobile/profile")) return "Profile";
//         return "Mobile";
//     };

//     const handleNavClick = (path: string) => {
//         if (path === pathname) return;
//         setOptimisticPath(path);
//         router.push(path);
//     };

//     const handleLogoClick = () => {
//         const targetPath = canSell
//             ? url("/mobile/pos")
//             : url("/mobile/profile"); // ← Changed

//         if (targetPath === pathname) return;

//         setOptimisticPath(targetPath);
//         router.push(targetPath);
//     };

//     return (
//         <div className="h-[100dvh] flex flex-col bg-gray-50 select-none">
//             <header className="sticky top-0 z-40 bg-white shadow-sm p-4">
//                 <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                         <Image
//                             src="/LEMONI-512x512.png"
//                             alt="Logo"
//                             width={30}
//                             height={30}
//                             className="rounded object-cover cursor-pointer transition-transform duration-75 active:scale-95"
//                             onClick={handleLogoClick}
//                         />
//                         <h1 className="text-2xl font-bold text-gray-800">
//                             {getCurrentPageTitle(currentPath)}
//                         </h1>
//                     </div>

//                     <div className="text-right">
//                         <h1 className="text-base font-bold text-gray-800">
//                             {user ? `Hi, ${profile?.fullName}` : "Welcome"}
//                         </h1>
//                         <p className="text-sm text-gray-500">
//                             {format(new Date(), "MMMM dd, yyyy")}
//                         </p>
//                     </div>
//                 </div>
//             </header>

//             <div className="p-4 pb-28 bg-gray-50">{children}</div>

//             <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
//                 <div className="flex">
//                     {tabs.map((tab) => {
//                         const Icon = tab.icon;
//                         const isActive = currentPath === tab.path;

//                         return (
//                             <button
//                                 key={tab.path}
//                                 onClick={() => handleNavClick(tab.path)}
//                                 className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 relative transition-all duration-75 active:scale-95 ${
//                                     isActive
//                                         ? "text-blue-600 bg-blue-50"
//                                         : "text-gray-600 hover:text-blue-500"
//                                 }`}
//                             >
//                                 <Icon
//                                     size={20}
//                                     className="transition-transform duration-75"
//                                 />
//                                 <span className="text-xs font-medium transition-transform duration-75">
//                                     {tab.label}
//                                 </span>
//                                 {isActive && (
//                                     <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full transition-all duration-200"></div>
//                                 )}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </footer>
//         </div>
//     );
// }

// app/mobile/MobileLayoutClient.tsx
"use client";
import { useEffect, ReactNode, useMemo, useState } from "react";
import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
import { useStores } from "@/lib/hooks/stores/useStores";
import { format } from "date-fns";
import Image from "next/image";
import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useTenantSlug } from "@/lib/tenant-url";

export interface Assignment {
    user_id: string;
    role: string;
    is_default: boolean;
}

export interface Assignments {
    [storeId: string]: Assignment[];
}

interface MobileLayoutClientProps {
    children: ReactNode;
}

export default function MobileLayoutClient({
    children,
}: MobileLayoutClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
    const [showLoader, setShowLoader] = useState(true);

    const { url } = useTenantSlug();

    const { profile, isLoading: profileLoading } = useAuth();
    const { data: storesData, isLoading: storesLoading } = useStores();

    const user = useMemo(
        () => (profile ? { id: profile.id } : null),
        [profile]
    );

    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData?.assignments]
    );

    const isLoading = profileLoading || storesLoading || !profile;

    const canSell = useMemo(
        () => !!user && hasSellerRole(user.id, assignments),
        [user, assignments]
    );

    const canManage = useMemo(
        () => !!user && hasManagerRole(user.id, assignments),
        [user, assignments]
    );

    const tabs = useMemo(
        () =>
            [
                {
                    path: url("/mobile/pos"),
                    label: "POS",
                    icon: ShoppingCart,
                    show: canSell,
                },
                {
                    path: url("/mobile/orders"),
                    label: "Orders",
                    icon: Clock,
                    show: canSell || canManage,
                },
                {
                    path: url("/mobile/analytics"),
                    label: "Analytics",
                    icon: BarChart3,
                    show: canManage,
                },
                {
                    path: url("/mobile/profile"),
                    label: "Profile",
                    icon: User,
                    show: true,
                },
            ].filter((tab) => tab.show),
        [canSell, canManage, url]
    );

    // --- place this ABOVE your "if (showLoader)" return ---
    useEffect(() => {
        if (!isLoading && showLoader) {
            const timer = setTimeout(() => setShowLoader(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isLoading, showLoader]);

    useEffect(() => {
        tabs.forEach((tab) => {
            router.prefetch(tab.path);
        });
    }, [tabs, router]);

    useEffect(() => {
        if (optimisticPath && pathname === optimisticPath) {
            setOptimisticPath(null);
        }
    }, [pathname, optimisticPath]);

    // if (isLoading) {
    if (showLoader) {
        return (
            <div className="h-[100dvh] overflow-hidden bg-white flex flex-col items-center justify-center">
                <div className="text-center" role="status" aria-live="polite">
                    <div className="mb-8">
                        <Image
                            src="/LEMONI-512x512.png"
                            alt="Logo"
                            width={80}
                            height={80}
                            className="rounded-xl shadow-2xl mx-auto"
                        />
                    </div>

                    <div className="w-64 h-1.5 loading-track rounded-full">
                        <div className="loading-bar" />
                    </div>

                    <div className="mt-4 text-xs text-gray-600 text-center">
                        <VersionInfo />
                    </div>
                </div>
            </div>
        );
    }

    const currentPath = optimisticPath || pathname;

    const getCurrentPageTitle = (path: string) => {
        if (path.endsWith("/mobile/pos")) return "POS";
        if (path.endsWith("/mobile/orders")) return "Orders";
        if (path.endsWith("/mobile/analytics")) return "Analytics";
        if (path.endsWith("/mobile/profile")) return "Profile";
        return "Mobile";
    };

    const handleNavClick = (path: string) => {
        if (path === pathname) return;
        setOptimisticPath(path);
        router.push(path);
    };

    const handleLogoClick = () => {
        const targetPath = canSell
            ? url("/mobile/pos")
            : url("/mobile/profile");

        if (targetPath === pathname) return;

        setOptimisticPath(targetPath);
        router.push(targetPath);
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50 select-none">
            <header className="sticky top-0 z-40 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/LEMONI-512x512.png"
                            alt="Logo"
                            width={30}
                            height={30}
                            className="rounded object-cover cursor-pointer transition-transform duration-75 active:scale-95"
                            onClick={handleLogoClick}
                        />
                        <h1 className="text-2xl font-bold text-gray-800">
                            {getCurrentPageTitle(currentPath)}
                        </h1>
                    </div>

                    <div className="text-right">
                        <h1 className="text-base font-bold text-gray-800">
                            {profile ? `Hi, ${profile.fullName}` : "Welcome"}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {format(new Date(), "MMMM dd, yyyy")}
                        </p>
                    </div>
                </div>
            </header>

            <div className="p-4 pb-28 bg-gray-50">{children}</div>

            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="flex">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = currentPath === tab.path;

                        return (
                            <button
                                key={tab.path}
                                onClick={() => handleNavClick(tab.path)}
                                className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 relative transition-all duration-75 active:scale-95 ${
                                    isActive
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-600 hover:text-blue-500"
                                }`}
                            >
                                <Icon
                                    size={20}
                                    className="transition-transform duration-75"
                                />
                                <span className="text-xs font-medium transition-transform duration-75">
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full transition-all duration-200"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </footer>
        </div>
    );
}
