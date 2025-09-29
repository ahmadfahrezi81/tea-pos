// // // app/mobile/MobileLayoutClient.tsx
// // "use client";
// // import { useEffect, ReactNode, useMemo, useState } from "react";
// // import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
// // import { useStores } from "@/lib/hooks/useData";
// // import { format } from "date-fns";
// // import Image from "next/image";
// // import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
// // import { useRouter, usePathname } from "next/navigation";
// // import { useAuth } from "@/lib/context/AuthContext";

// // export interface Assignment {
// //     user_id: string;
// //     role: string;
// //     is_default: boolean;
// // }

// // export interface Assignments {
// //     [storeId: string]: Assignment[];
// // }

// // interface MobileLayoutClientProps {
// //     children: ReactNode;
// // }

// // export default function MobileLayoutClient({
// //     children,
// // }: MobileLayoutClientProps) {
// //     const router = useRouter();
// //     const pathname = usePathname();
// //     const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

// //     const { profile, isLoading: profileLoading } = useAuth();
// //     const { data: storesData, isLoading: storesLoading } = useStores();

// //     const user = useMemo(
// //         () => (profile ? { id: profile.id } : null),
// //         [profile]
// //     );

// //     const assignments = useMemo(
// //         () => storesData?.assignments ?? {},
// //         [storesData?.assignments]
// //     );

// //     // Combined loading state - wait for both profile and stores data
// //     const isLoading = profileLoading || (profile && storesLoading);

// //     // Define tabs early so we can use them in useEffect
// //     const tabs = useMemo(
// //         () =>
// //             [
// //                 {
// //                     path: "/mobile/pos",
// //                     label: "POS",
// //                     icon: ShoppingCart,
// //                     show: !!user && hasSellerRole(user.id, assignments),
// //                 },
// //                 {
// //                     path: "/mobile/orders",
// //                     label: "Orders",
// //                     icon: Clock,
// //                     show:
// //                         !!user &&
// //                         (hasSellerRole(user.id, assignments) ||
// //                             hasManagerRole(user.id, assignments)),
// //                 },
// //                 {
// //                     path: "/mobile/analytics",
// //                     label: "Analytics",
// //                     icon: BarChart3,
// //                     show: !!user && hasManagerRole(user.id, assignments),
// //                 },
// //                 {
// //                     path: "/mobile/profile",
// //                     label: user ? "Profile" : "Login",
// //                     icon: User,
// //                     show: true, // Always show profile/login
// //                 },
// //             ].filter((tab) => tab.show),
// //         [user, assignments]
// //     );

// //     // Prefetch all routes in the background
// //     useEffect(() => {
// //         tabs.forEach((tab) => {
// //             router.prefetch(tab.path);
// //         });
// //     }, [tabs, router]);

// //     // Reset optimistic path when actual pathname changes
// //     useEffect(() => {
// //         if (optimisticPath && pathname === optimisticPath) {
// //             setOptimisticPath(null);
// //         }
// //     }, [pathname, optimisticPath]);

// //     // Only redirect after all data has loaded
// //     useEffect(() => {
// //         if (isLoading) return;

// //         if (!user) {
// //             if (pathname !== "/mobile/profile") {
// //                 router.push("/mobile/profile");
// //             }
// //             return;
// //         }

// //         if (
// //             pathname === "/mobile/pos" &&
// //             !hasSellerRole(user.id, assignments)
// //         ) {
// //             router.push("/mobile/profile");
// //         }

// //         if (
// //             pathname === "/mobile/orders" &&
// //             !(
// //                 hasSellerRole(user.id, assignments) ||
// //                 hasManagerRole(user.id, assignments)
// //             )
// //         ) {
// //             router.push("/mobile/profile");
// //         }

// //         if (
// //             pathname === "/mobile/analytics" &&
// //             !hasManagerRole(user.id, assignments)
// //         ) {
// //             router.push("/mobile/profile");
// //         }
// //     }, [user, isLoading, pathname, assignments, router]);

// //     if (isLoading) {
// //         return (
// //             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
// //                 <div className="text-center">
// //                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
// //                     <p className="text-gray-600">Loading...</p>
// //                 </div>
// //             </div>
// //         );
// //     }

// //     const currentPath = optimisticPath || pathname;

// //     const getCurrentPageTitle = (path: string) => {
// //         switch (path) {
// //             case "/mobile/pos":
// //                 return "POS";
// //             case "/mobile/orders":
// //                 return "Orders";
// //             case "/mobile/analytics":
// //                 return "Analytics";
// //             case "/mobile/profile":
// //                 return "Profile";
// //             default:
// //                 return "Mobile";
// //         }
// //     };

// //     const handleNavClick = (path: string) => {
// //         if (path === pathname) return; // Don't navigate if already on the same path

// //         setOptimisticPath(path); // instantly highlight tab and update title
// //         router.push(path);
// //     };

// //     const handleLogoClick = () => {
// //         const targetPath =
// //             user && hasSellerRole(user.id, assignments)
// //                 ? "/mobile/pos"
// //                 : "/mobile/profile";

// //         if (targetPath === pathname) return;

// //         setOptimisticPath(targetPath);
// //         router.push(targetPath);

// //         setTimeout(() => {
// //             setOptimisticPath(null);
// //         }, 1000);
// //     };

// //     return (
// //         <div className="min-h-screen bg-gray-50 pb-20 select-none">
// //             {/* Header */}
// //             <div className="sticky top-0 z-40 bg-white shadow-sm p-4 flex justify-between items-center">
// //                 <div className="flex gap-2 items-center">
// //                     <Image
// //                         src={"/LEMONI-512x512.png"}
// //                         alt={"Logo"}
// //                         width={30}
// //                         height={30}
// //                         className="rounded object-cover cursor-pointer transition-transform duration-75 active:scale-95"
// //                         onClick={handleLogoClick}
// //                     />
// //                     <h1 className="text-2xl font-bold text-gray-800">
// //                         {getCurrentPageTitle(currentPath)}
// //                     </h1>
// //                 </div>
// //                 <div className="text-right">
// //                     <h1 className="text-base font-bold text-gray-800">
// //                         {user ? `Hi, ${profile?.full_name}` : "Welcome"}
// //                     </h1>
// //                     <p className="text-sm text-gray-500">
// //                         {format(new Date(), "MMMM dd, yyyy")}
// //                     </p>
// //                 </div>
// //             </div>

// //             {/* Main Content */}
// //             <div className="p-4">{children}</div>

// //             {/* Bottom Navigation */}
// //             <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
// //                 <div className="flex">
// //                     {tabs.map((tab) => {
// //                         const Icon = tab.icon;
// //                         const isActive = currentPath === tab.path;

// //                         return (
// //                             <button
// //                                 key={tab.path}
// //                                 onClick={() => handleNavClick(tab.path)}
// //                                 className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 relative transition-all duration-75 active:scale-95 ${
// //                                     isActive
// //                                         ? "text-blue-600 bg-blue-50"
// //                                         : "text-gray-600 hover:text-blue-500"
// //                                 }`}
// //                             >
// //                                 <Icon
// //                                     size={20}
// //                                     className="transition-transform duration-75"
// //                                 />
// //                                 <span className="text-xs font-medium transition-transform duration-75">
// //                                     {tab.label}
// //                                 </span>
// //                                 {isActive && (
// //                                     <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full transition-all duration-200"></div>
// //                                 )}
// //                             </button>
// //                         );
// //                     })}
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // }

// // app/mobile/MobileLayoutClient.tsx
// "use client";
// import { useEffect, ReactNode, useMemo, useState } from "react";
// import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
// import { useStores } from "@/lib/hooks/useData";
// import { format } from "date-fns";
// import Image from "next/image";
// import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
// import { useRouter, usePathname } from "next/navigation";
// import { useAuth } from "@/lib/context/AuthContext";

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

//     // Get profile reactively
//     // const { data: profile, isLoading: profileLoading, mutate } = useProfile();
//     const { profile, isLoading: profileLoading } = useAuth();

//     // Get store assignments data
//     const { data: storesData, isLoading: storesLoading } = useStores();

//     const user = useMemo(
//         () => (profile ? { id: profile.id } : null),
//         [profile]
//     );

//     const assignments = useMemo(
//         () => storesData?.assignments ?? {},
//         [storesData?.assignments]
//     );

//     // Combined loading state - wait for both profile and stores data
//     const isLoading = profileLoading || (profile && storesLoading);

//     // Listen for auth changes & refresh profile
//     // useEffect(() => {
//     //     const {
//     //         data: { subscription },
//     //     } = supabase.auth.onAuthStateChange(() => {
//     //         mutate(); // only refresh profile
//     //     });

//     //     return () => subscription.unsubscribe();
//     // }, [mutate]);

//     // Define tabs early so we can use them in useEffect
//     const tabs = useMemo(
//         () =>
//             [
//                 {
//                     path: "/mobile/pos",
//                     label: "POS",
//                     icon: ShoppingCart,
//                     show: !!user && hasSellerRole(user.id, assignments),
//                 },
//                 {
//                     path: "/mobile/orders",
//                     label: "Orders",
//                     icon: Clock,
//                     show:
//                         !!user &&
//                         (hasSellerRole(user.id, assignments) ||
//                             hasManagerRole(user.id, assignments)),
//                 },
//                 {
//                     path: "/mobile/analytics",
//                     label: "Analytics",
//                     icon: BarChart3,
//                     show: !!user && hasManagerRole(user.id, assignments),
//                 },
//                 {
//                     path: "/mobile/profile",
//                     label: user ? "Profile" : "Login",
//                     icon: User,
//                     show: true, // Always show profile/login
//                 },
//             ].filter((tab) => tab.show),
//         [user, assignments]
//     );

//     // Prefetch all routes in the background
//     useEffect(() => {
//         tabs.forEach((tab) => {
//             router.prefetch(tab.path);
//         });
//     }, [tabs, router]);

//     // Reset optimistic path when actual pathname changes
//     useEffect(() => {
//         if (optimisticPath && pathname === optimisticPath) {
//             setOptimisticPath(null);
//         }
//     }, [pathname, optimisticPath]);

//     // Only redirect after all data has loaded
//     useEffect(() => {
//         if (isLoading) return;

//         if (!user) {
//             if (pathname !== "/mobile/profile") {
//                 router.push("/mobile/profile");
//             }
//             return;
//         }

//         if (
//             pathname === "/mobile/pos" &&
//             !hasSellerRole(user.id, assignments)
//         ) {
//             router.push("/mobile/profile");
//         }

//         if (
//             pathname === "/mobile/orders" &&
//             !(
//                 hasSellerRole(user.id, assignments) ||
//                 hasManagerRole(user.id, assignments)
//             )
//         ) {
//             router.push("/mobile/profile");
//         }

//         if (
//             pathname === "/mobile/analytics" &&
//             !hasManagerRole(user.id, assignments)
//         ) {
//             router.push("/mobile/profile");
//         }
//     }, [user, isLoading, pathname, assignments, router]);

//     if (isLoading) {
//         return (
//             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
//                     <p className="text-gray-600">Loading...</p>
//                 </div>
//             </div>
//         );
//     }

//     const currentPath = optimisticPath || pathname;

//     const getCurrentPageTitle = (path: string) => {
//         switch (path) {
//             case "/mobile/pos":
//                 return "POS";
//             case "/mobile/orders":
//                 return "Orders";
//             case "/mobile/analytics":
//                 return "Analytics";
//             case "/mobile/profile":
//                 return "Profile";
//             default:
//                 return "Mobile";
//         }
//     };

//     const handleNavClick = (path: string) => {
//         if (path === pathname) return; // Don't navigate if already on the same path

//         setOptimisticPath(path); // instantly highlight tab and update title
//         router.push(path);

//         // Reset optimistic path after a timeout as fallback
//         // setTimeout(() => {
//         //     setOptimisticPath(null);
//         // }, 1000);
//     };

//     const handleLogoClick = () => {
//         const targetPath =
//             user && hasSellerRole(user.id, assignments)
//                 ? "/mobile/pos"
//                 : "/mobile/profile";

//         if (targetPath === pathname) return;

//         setOptimisticPath(targetPath);
//         router.push(targetPath);

//         setTimeout(() => {
//             setOptimisticPath(null);
//         }, 1000);
//     };

//     return (
//         <div className="min-h-screen bg-gray-50 pb-20 select-none">
//             {/* Header */}
//             <div className="sticky top-0 z-40 bg-white shadow-sm p-4 flex justify-between items-center">
//                 <div className="flex gap-2 items-center">
//                     <Image
//                         src={"/LEMONI-512x512.png"}
//                         alt={"Logo"}
//                         width={30}
//                         height={30}
//                         className="rounded object-cover cursor-pointer transition-transform duration-75 active:scale-95"
//                         onClick={handleLogoClick}
//                     />
//                     <h1 className="text-2xl font-bold text-gray-800">
//                         {getCurrentPageTitle(currentPath)}
//                     </h1>
//                 </div>
//                 <div className="text-right">
//                     <h1 className="text-base font-bold text-gray-800">
//                         {user ? `Hi, ${profile?.full_name}` : "Welcome"}
//                     </h1>
//                     <p className="text-sm text-gray-500">
//                         {format(new Date(), "MMMM dd, yyyy")}
//                     </p>
//                 </div>
//             </div>

//             {/* Main Content */}
//             <div className="p-4">{children}</div>

//             {/* Bottom Navigation */}
//             <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
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
//             </div>
//         </div>
//     );
// }

// app/mobile/MobileLayoutClient.tsx
"use client";
import { useEffect, ReactNode, useMemo, useState } from "react";
import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
import { useStores } from "@/lib/hooks/useData";
import { format } from "date-fns";
import Image from "next/image";
import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import packageJson from "@/package.json";

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

    // Combined loading state
    const isLoading = profileLoading || (profile && storesLoading);

    // Memoize role checks
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
                    path: "/mobile/pos",
                    label: "POS",
                    icon: ShoppingCart,
                    show: canSell,
                },
                {
                    path: "/mobile/orders",
                    label: "Orders",
                    icon: Clock,
                    show: canSell || canManage,
                },
                {
                    path: "/mobile/analytics",
                    label: "Analytics",
                    icon: BarChart3,
                    show: canManage,
                },
                {
                    path: "/mobile/profile",
                    label: user ? "Profile" : "Login",
                    icon: User,
                    show: true,
                },
            ].filter((tab) => tab.show),
        [user, canSell, canManage]
    );

    // Prefetch all routes
    useEffect(() => {
        tabs.forEach((tab) => {
            router.prefetch(tab.path);
        });
    }, [tabs, router]);

    // Reset optimistic path when pathname changes
    useEffect(() => {
        if (optimisticPath && pathname === optimisticPath) {
            setOptimisticPath(null);
        }
    }, [pathname, optimisticPath]);

    // Role-based redirects (only after data loads)
    useEffect(() => {
        if (isLoading) return;

        if (!user && pathname !== "/mobile/profile") {
            router.push("/mobile/profile");
            return;
        }

        if (pathname === "/mobile/pos" && !canSell) {
            router.push("/mobile/profile");
        }

        if (pathname === "/mobile/orders" && !(canSell || canManage)) {
            router.push("/mobile/profile");
        }

        if (pathname === "/mobile/analytics" && !canManage) {
            router.push("/mobile/profile");
        }
    }, [user, isLoading, pathname, canSell, canManage, router]);

    if (true) {
        return (
            <div className="h-[100dvh] overflow-hidden bg-white flex flex-col items-center justify-center">
                {" "}
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

                    {/* Indeterminate loading bar (robust) */}
                    <div className="w-64 h-1.5 loading-track rounded-full">
                        <div className="loading-bar" />
                    </div>

                    <div className="mt-4 text-xs text-gray-600 text-center">
                        TEA-POS v{packageJson.version}
                    </div>
                </div>
            </div>
        );
    }

    const currentPath = optimisticPath || pathname;

    const getCurrentPageTitle = (path: string) => {
        switch (path) {
            case "/mobile/pos":
                return "POS";
            case "/mobile/orders":
                return "Orders";
            case "/mobile/analytics":
                return "Analytics";
            case "/mobile/profile":
                return "Profile";
            default:
                return "Mobile";
        }
    };

    const handleNavClick = (path: string) => {
        if (path === pathname) return;
        setOptimisticPath(path);
        router.push(path);
    };

    const handleLogoClick = () => {
        const targetPath = canSell ? "/mobile/pos" : "/mobile/profile";

        if (targetPath === pathname) return;

        setOptimisticPath(targetPath);
        router.push(targetPath);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 select-none">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-sm p-4 flex justify-between items-center">
                <div className="flex gap-2 items-center">
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
                        {user ? `Hi, ${profile?.full_name}` : "Welcome"}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {format(new Date(), "MMMM dd, yyyy")}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4">{children}</div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
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
            </div>
        </div>
    );
}
