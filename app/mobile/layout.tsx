// // "use client";
// // import { useEffect, ReactNode } from "react";
// // import { createClient } from "@/lib/supabase/client";
// // import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
// // import { useProfile, useStores } from "@/lib/hooks/useData";
// // import { format } from "date-fns";
// // import Image from "next/image";
// // import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
// // import { useRouter, usePathname } from "next/navigation";

// // export interface Assignment {
// //     user_id: string;
// //     role: string;
// //     is_default: boolean;
// // }

// // export interface Assignments {
// //     [storeId: string]: Assignment[];
// // }

// // interface MobileLayoutProps {
// //     children: ReactNode;
// // }

// // export default function MobileLayout({ children }: MobileLayoutProps) {
// //     const router = useRouter();
// //     const pathname = usePathname();
// //     const supabase = createClient();

// //     // Get profile reactively
// //     const { data: profile, isLoading, mutate } = useProfile();
// //     const user = profile ? { id: profile.id } : null;

// //     // Get store assignments data
// //     const { data: storesData } = useStores(profile?.id ?? "");
// //     const assignments = storesData?.assignments ?? {};

// //     // Listen for auth changes & refresh profile
// //     useEffect(() => {
// //         const { data: authListener } = supabase.auth.onAuthStateChange(
// //             (event) => {
// //                 if (event === "SIGNED_IN") {
// //                     mutate();
// //                     // Redirect to POS if user has seller role, otherwise profile
// //                     if (user && hasSellerRole(user.id, assignments)) {
// //                         router.push("/mobile/pos");
// //                     } else {
// //                         router.push("/mobile/profile");
// //                     }
// //                 } else if (event === "SIGNED_OUT") {
// //                     mutate();
// //                     router.push("/mobile/profile");
// //                 }
// //             }
// //         );
// //         return () => authListener.subscription.unsubscribe();
// //     }, [mutate, supabase, router, user, assignments]);

// //     // Redirect unauthenticated users to profile page
// //     useEffect(() => {
// //         if (!isLoading && !user && pathname !== "/mobile/profile") {
// //             router.push("/mobile/profile");
// //         }
// //     }, [user, isLoading, pathname, router]);

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

// //     const getCurrentPageTitle = () => {
// //         switch (pathname) {
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

// //     const tabs = [
// //         {
// //             path: "/mobile/pos",
// //             label: "POS",
// //             icon: ShoppingCart,
// //             show: !!user && hasSellerRole(user.id, assignments),
// //         },
// //         {
// //             path: "/mobile/orders",
// //             label: "Orders",
// //             icon: Clock,
// //             show:
// //                 !!user &&
// //                 hasSellerRole(user.id, assignments) &&
// //                 hasManagerRole(user.id, assignments),
// //         },
// //         {
// //             path: "/mobile/analytics",
// //             label: "Analytics",
// //             icon: BarChart3,
// //             show: !!user && hasManagerRole(user.id, assignments),
// //         },
// //         {
// //             path: "/mobile/profile",
// //             label: user ? "Profile" : "Login",
// //             icon: User,
// //             show: true,
// //         },
// //     ].filter((tab) => tab.show);

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
// //                         className="rounded object-cover cursor-pointer"
// //                         onClick={() => {
// //                             if (user && hasSellerRole(user.id, assignments)) {
// //                                 router.push("/mobile/pos");
// //                             }
// //                         }}
// //                     />
// //                     <h1 className="text-2xl font-bold text-gray-800 capitalize">
// //                         {getCurrentPageTitle()}
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
// //                         const isActive = pathname === tab.path;

// //                         return (
// //                             <button
// //                                 key={tab.path}
// //                                 onClick={() => router.push(tab.path)}
// //                                 className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 ${
// //                                     isActive
// //                                         ? "text-blue-600 bg-blue-50"
// //                                         : "text-gray-600"
// //                                 }`}
// //                             >
// //                                 <Icon size={20} />
// //                                 <span className="text-xs font-medium">
// //                                     {tab.label}
// //                                 </span>
// //                             </button>
// //                         );
// //                     })}
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // }

// "use client";
// import { useEffect, ReactNode } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
// import { useProfile, useStores } from "@/lib/hooks/useData";
// import { format } from "date-fns";
// import Image from "next/image";
// import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
// import { useRouter, usePathname } from "next/navigation";

// export interface Assignment {
//     user_id: string;
//     role: string;
//     is_default: boolean;
// }

// export interface Assignments {
//     [storeId: string]: Assignment[];
// }

// interface MobileLayoutProps {
//     children: ReactNode;
// }

// const supabase = createClient();

// export default function MobileLayout({ children }: MobileLayoutProps) {
//     const router = useRouter();
//     const pathname = usePathname();

//     // Get profile reactively
//     const { data: profile, isLoading, mutate } = useProfile();
//     const user = profile ? { id: profile.id } : null;

//     // Get store assignments data
//     const { data: storesData } = useStores(profile?.id ?? "");
//     const assignments = storesData?.assignments ?? {};

//     // Listen for auth changes & refresh profile
//     useEffect(() => {
//         const {
//             data: { subscription },
//         } = supabase.auth.onAuthStateChange(() => {
//             mutate(); // only refresh profile
//         });

//         return () => subscription.unsubscribe();
//     }, [mutate]);

//     // Redirect unauthenticated users to profile page
//     useEffect(() => {
//         if (!isLoading && !user && pathname !== "/mobile/profile") {
//             router.push("/mobile/profile");
//         }
//     }, [user, isLoading, pathname, router]);

//     // Redirect authenticated users with seller role to POS if they land on profile
//     useEffect(() => {
//         if (!isLoading && user && storesData) {
//             if (
//                 pathname === "/mobile/profile" &&
//                 hasSellerRole(user.id, assignments)
//             ) {
//                 router.push("/mobile/pos");
//             }
//         }
//     }, [user, isLoading, storesData, pathname, assignments, router]);

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

//     const getCurrentPageTitle = () => {
//         switch (pathname) {
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

//     const tabs = [
//         {
//             path: "/mobile/pos",
//             label: "POS",
//             icon: ShoppingCart,
//             show: !!user && hasSellerRole(user.id, assignments),
//         },
//         {
//             path: "/mobile/orders",
//             label: "Orders",
//             icon: Clock,
//             show:
//                 !!user &&
//                 hasSellerRole(user.id, assignments) &&
//                 hasManagerRole(user.id, assignments),
//         },
//         {
//             path: "/mobile/analytics",
//             label: "Analytics",
//             icon: BarChart3,
//             show: !!user && hasManagerRole(user.id, assignments),
//         },
//         {
//             path: "/mobile/profile",
//             label: user ? "Profile" : "Login",
//             icon: User,
//             show: true,
//         },
//     ].filter((tab) => tab.show);

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
//                         className="rounded object-cover cursor-pointer"
//                         onClick={() => {
//                             if (user && hasSellerRole(user.id, assignments)) {
//                                 router.push("/mobile/pos");
//                             }
//                         }}
//                     />
//                     <h1 className="text-2xl font-bold text-gray-800">
//                         {getCurrentPageTitle()}
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
//                         const isActive = pathname.startsWith(tab.path);

//                         return (
//                             <button
//                                 key={tab.path}
//                                 onClick={() => router.push(tab.path)}
//                                 className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 ${
//                                     isActive
//                                         ? "text-blue-600 bg-blue-50"
//                                         : "text-gray-600"
//                                 }`}
//                             >
//                                 <Icon size={20} />
//                                 <span className="text-xs font-medium">
//                                     {tab.label}
//                                 </span>
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>
//         </div>
//     );
// }

// //app/mobile/layout.tsx
// "use client";
// import { useEffect, ReactNode, useMemo } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
// import { useProfile, useStores } from "@/lib/hooks/useData";
// import { format } from "date-fns";
// import Image from "next/image";
// import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
// import { useRouter, usePathname } from "next/navigation";

// export interface Assignment {
//     user_id: string;
//     role: string;
//     is_default: boolean;
// }

// export interface Assignments {
//     [storeId: string]: Assignment[];
// }

// interface MobileLayoutProps {
//     children: ReactNode;
// }

// const supabase = createClient();

// export default function MobileLayout({ children }: MobileLayoutProps) {
//     const router = useRouter();
//     const pathname = usePathname();

//     // Get profile reactively
//     const { data: profile, isLoading: profileLoading, mutate } = useProfile();

//     // Get store assignments data
//     const { data: storesData, isLoading: storesLoading } = useStores(
//         profile?.id ?? ""
//     );

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
//     useEffect(() => {
//         const {
//             data: { subscription },
//         } = supabase.auth.onAuthStateChange(() => {
//             mutate(); // only refresh profile
//         });

//         return () => subscription.unsubscribe();
//     }, [mutate]);

//     // Only redirect after all data has loaded
//     useEffect(() => {
//         // Don't do anything while still loading
//         if (isLoading) return;

//         // Not logged in → always go to profile
//         if (!user) {
//             if (pathname !== "/mobile/profile") {
//                 router.push("/mobile/profile");
//             }
//             return;
//         }

//         // Logged in but no role access → redirect them away
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

//     const getCurrentPageTitle = () => {
//         switch (pathname) {
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

//     const tabs = [
//         {
//             path: "/mobile/pos",
//             label: "POS",
//             icon: ShoppingCart,
//             show: !!user && hasSellerRole(user.id, assignments),
//         },
//         {
//             path: "/mobile/orders",
//             label: "Orders",
//             icon: Clock,
//             show:
//                 !!user &&
//                 (hasSellerRole(user.id, assignments) ||
//                     hasManagerRole(user.id, assignments)),
//         },
//         {
//             path: "/mobile/analytics",
//             label: "Analytics",
//             icon: BarChart3,
//             show: !!user && hasManagerRole(user.id, assignments),
//         },
//         {
//             path: "/mobile/profile",
//             label: user ? "Profile" : "Login",
//             icon: User,
//             show: true, // Always show profile/login
//         },
//     ].filter((tab) => tab.show);

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
//                         className="rounded object-cover cursor-pointer"
//                         onClick={() => {
//                             if (user && hasSellerRole(user.id, assignments)) {
//                                 router.push("/mobile/pos");
//                             } else {
//                                 router.push("/mobile/profile");
//                             }
//                         }}
//                     />
//                     <h1 className="text-2xl font-bold text-gray-800">
//                         {getCurrentPageTitle()}
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
//                         const isActive = pathname === tab.path;

//                         return (
//                             <button
//                                 key={tab.path}
//                                 onClick={() => router.push(tab.path)}
//                                 className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 relative ${
//                                     isActive
//                                         ? "text-blue-600 bg-blue-50"
//                                         : "text-gray-600"
//                                 }`}
//                             >
//                                 <Icon size={20} />
//                                 <span className="text-xs font-medium">
//                                     {tab.label}
//                                 </span>
//                                 {isActive && (
//                                     <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full"></div>
//                                 )}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>
//         </div>
//     );
// }
// app/mobile/layout.tsx
"use client";
import { useEffect, ReactNode, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, ShoppingCart, Clock, BarChart3 } from "lucide-react";
import { useProfile, useStores } from "@/lib/hooks/useData";
import { format } from "date-fns";
import Image from "next/image";
import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
import { useRouter, usePathname } from "next/navigation";

export interface Assignment {
    user_id: string;
    role: string;
    is_default: boolean;
}

export interface Assignments {
    [storeId: string]: Assignment[];
}

interface MobileLayoutProps {
    children: ReactNode;
}

const supabase = createClient();

export default function MobileLayout({ children }: MobileLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

    // Get profile reactively
    const { data: profile, isLoading: profileLoading, mutate } = useProfile();

    // Get store assignments data
    const { data: storesData, isLoading: storesLoading } = useStores(
        profile?.id ?? ""
    );

    const user = useMemo(
        () => (profile ? { id: profile.id } : null),
        [profile]
    );

    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData?.assignments]
    );

    // Combined loading state - wait for both profile and stores data
    const isLoading = profileLoading || (profile && storesLoading);

    // Listen for auth changes & refresh profile
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            mutate(); // only refresh profile
        });

        return () => subscription.unsubscribe();
    }, [mutate]);

    // Define tabs early so we can use them in useEffect
    const tabs = useMemo(
        () =>
            [
                {
                    path: "/mobile/pos",
                    label: "POS",
                    icon: ShoppingCart,
                    show: !!user && hasSellerRole(user.id, assignments),
                },
                {
                    path: "/mobile/orders",
                    label: "Orders",
                    icon: Clock,
                    show:
                        !!user &&
                        (hasSellerRole(user.id, assignments) ||
                            hasManagerRole(user.id, assignments)),
                },
                {
                    path: "/mobile/analytics",
                    label: "Analytics",
                    icon: BarChart3,
                    show: !!user && hasManagerRole(user.id, assignments),
                },
                {
                    path: "/mobile/profile",
                    label: user ? "Profile" : "Login",
                    icon: User,
                    show: true, // Always show profile/login
                },
            ].filter((tab) => tab.show),
        [user, assignments]
    );

    // Prefetch all routes in the background
    useEffect(() => {
        tabs.forEach((tab) => {
            router.prefetch(tab.path);
        });
    }, [tabs, router]);

    // Reset optimistic path when actual pathname changes
    useEffect(() => {
        if (optimisticPath && pathname === optimisticPath) {
            setOptimisticPath(null);
        }
    }, [pathname, optimisticPath]);

    // Only redirect after all data has loaded
    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            if (pathname !== "/mobile/profile") {
                router.push("/mobile/profile");
            }
            return;
        }

        if (
            pathname === "/mobile/pos" &&
            !hasSellerRole(user.id, assignments)
        ) {
            router.push("/mobile/profile");
        }

        if (
            pathname === "/mobile/orders" &&
            !(
                hasSellerRole(user.id, assignments) ||
                hasManagerRole(user.id, assignments)
            )
        ) {
            router.push("/mobile/profile");
        }

        if (
            pathname === "/mobile/analytics" &&
            !hasManagerRole(user.id, assignments)
        ) {
            router.push("/mobile/profile");
        }
    }, [user, isLoading, pathname, assignments, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
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
        if (path === pathname) return; // Don't navigate if already on the same path

        setOptimisticPath(path); // instantly highlight tab and update title
        router.push(path);

        // Reset optimistic path after a timeout as fallback
        // setTimeout(() => {
        //     setOptimisticPath(null);
        // }, 1000);
    };

    const handleLogoClick = () => {
        const targetPath =
            user && hasSellerRole(user.id, assignments)
                ? "/mobile/pos"
                : "/mobile/profile";

        if (targetPath === pathname) return;

        setOptimisticPath(targetPath);
        router.push(targetPath);

        setTimeout(() => {
            setOptimisticPath(null);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 select-none">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-sm p-4 flex justify-between items-center">
                <div className="flex gap-2 items-center">
                    <Image
                        src={"/LEMONI-512x512.png"}
                        alt={"Logo"}
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
