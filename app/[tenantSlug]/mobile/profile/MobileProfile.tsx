// "use client";
// import { useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useStores } from "@/lib/hooks/stores/useStores";
// import { useAuth } from "@/lib/context/AuthContext";
// import VersionInfo from "@/components/shared/VersionInfo";
// import { useRouter } from "next/navigation";

// export default function MobileProfile() {
//     const supabase = createClient();
//     const router = useRouter();

//     const { profile } = useAuth();
//     const { data: storeData, isLoading: storesLoading } = useStores();
//     const stores = storeData?.stores ?? [];
//     const assignments = storeData?.assignments ?? {};

//     const handleLogout = useCallback(async () => {
//         const shouldLogout = window.confirm(
//             "Are you sure you want to log out?"
//         );
//         if (shouldLogout) {
//             await supabase.auth.signOut();
//             router.push("/login");
//         }
//     }, [router, supabase]);

//     // Profile is guaranteed by middleware, but check for safety
//     if (!profile) {
//         return null;
//     }

//     return (
//         <div className="space-y-6">
//             <div className="bg-white rounded-xl p-5 shadow-sm">
//                 <div className="space-y-4">
//                     <div className="bg-blue-50 p-4 rounded-lg">
//                         <div className="text-center">
//                             <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
//                                 <span className="text-white text-xl font-bold">
//                                     {profile.fullName.charAt(0).toUpperCase()}
//                                 </span>
//                             </div>
//                             <h3 className="text-lg font-semibold text-gray-800">
//                                 {profile.fullName}
//                             </h3>
//                             <p className="text-gray-600">{profile.email}</p>
//                         </div>
//                     </div>

//                     <h4 className="text-gray-800 text-sm font-semibold mb-1">
//                         Assigned Stores:
//                     </h4>

//                     <div className="bg-gray-50 py-1 px-2 rounded-lg border-1 border-gray-200 text-gray-800">
//                         <div className="flex justify-between items-center">
//                             {storesLoading && (
//                                 <span className="text-gray-500 text-sm">
//                                     Loading...
//                                 </span>
//                             )}
//                         </div>

//                         {!storesLoading && stores.length > 0 ? (
//                             <div className="">
//                                 {stores.map((store) => (
//                                     <div
//                                         key={store.id}
//                                         className="flex justify-between items-center border-b border-gray-300 last:border-none py-2"
//                                     >
//                                         <span className="text-gray-800 text-sm font-medium">
//                                             {store.name}
//                                         </span>

//                                         {/* Roles as styled chips */}
//                                         {assignments[store.id] ? (
//                                             <div className="flex gap-2 flex-wrap justify-end">
//                                                 {assignments[store.id].map(
//                                                     (
//                                                         assignment,
//                                                         index: number
//                                                     ) => (
//                                                         <span
//                                                             key={index}
//                                                             className="flex items-center space-x-2"
//                                                         >
//                                                             <span
//                                                                 className={`px-2 py-1 rounded-full text-xs font-medium ${
//                                                                     assignment.role ===
//                                                                     "manager"
//                                                                         ? "bg-blue-100 text-blue-700"
//                                                                         : assignment.role ===
//                                                                           "seller"
//                                                                         ? "bg-green-100 text-green-700"
//                                                                         : "bg-gray-100 text-gray-700"
//                                                                 }`}
//                                                             >
//                                                                 {assignment.role
//                                                                     .charAt(0)
//                                                                     .toUpperCase() +
//                                                                     assignment.role.slice(
//                                                                         1
//                                                                     )}
//                                                             </span>
//                                                             {assignment.isDefault && (
//                                                                 <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                                                                     Default
//                                                                 </span>
//                                                             )}
//                                                         </span>
//                                                     )
//                                                 )}
//                                             </div>
//                                         ) : (
//                                             <span className="text-xs text-gray-400">
//                                                 No roles assigned
//                                             </span>
//                                         )}
//                                     </div>
//                                 ))}
//                             </div>
//                         ) : (
//                             !storesLoading && (
//                                 <span className="text-gray-500 text-sm">
//                                     No stores assigned
//                                 </span>
//                             )
//                         )}
//                     </div>

//                     <div className="bg-gray-50 p-4 rounded-lg">
//                         <div className="flex justify-between items-center">
//                             <span className="text-gray-700 font-semibold">
//                                 Member since:
//                             </span>
//                             <span className="text-gray-800">
//                                 {profile.createdAt
//                                     ? new Date(
//                                           profile.createdAt
//                                       ).toLocaleDateString()
//                                     : "N/A"}
//                             </span>
//                         </div>
//                     </div>

//                     {/* Logout Button */}
//                     <div className="text-center">
//                         <button
//                             onClick={handleLogout}
//                             className="text-sm font-bold text-red-600 hover:text-red-800 border-1 p-2 px-6 rounded-full"
//                         >
//                             Log Out
//                         </button>
//                     </div>
//                     <div className="mt-4 text-xs text-gray-500 text-center">
//                         <VersionInfo />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

"use client";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStores } from "@/lib/hooks/stores/useStores";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@/lib/tenant-url";

export default function MobileProfile() {
    const supabase = createClient();
    const router = useRouter();

    const { url } = useTenantSlug();

    const { profile } = useAuth();
    const { data: storeData, isLoading: storesLoading } = useStores();
    const stores = storeData?.stores ?? [];
    const assignments = storeData?.assignments ?? {};

    const handleLogout = useCallback(async () => {
        const shouldLogout = window.confirm(
            "Are you sure you want to log out?"
        );
        if (shouldLogout) {
            await supabase.auth.signOut();
            router.push("/login");
        }
    }, [router, supabase]);

    // const handleAdminDashboard = useCallback(() => {
    //     router.push(url("/admin/dashboard"));
    // }, [router, url]);

    const handleAdminDashboard = useCallback(() => {
        window.open(url("/admin"), "_blank", "noopener,noreferrer");
    }, [url]);

    // Profile is guaranteed by middleware, but check for safety
    if (!profile) {
        return null;
    }

    // Check if user is admin - adjust this condition based on your profile structure
    const isAdmin = profile.role === "ADMIN"; // Or profile.isAdmin, or however admin is stored

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-white text-xl font-bold">
                                    {profile.fullName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {profile.fullName}
                            </h3>
                            <p className="text-gray-600">{profile.email}</p>
                        </div>
                    </div>

                    <h4 className="text-gray-800 text-sm font-semibold mb-1">
                        Assigned Stores:
                    </h4>

                    <div className="bg-gray-50 py-1 px-2 rounded-lg border-1 border-gray-200 text-gray-800">
                        <div className="flex justify-between items-center">
                            {storesLoading && (
                                <span className="text-gray-500 text-sm">
                                    Loading...
                                </span>
                            )}
                        </div>

                        {!storesLoading && stores.length > 0 ? (
                            <div className="">
                                {stores.map((store) => (
                                    <div
                                        key={store.id}
                                        className="flex justify-between items-center border-b border-gray-300 last:border-none py-2"
                                    >
                                        <span className="text-gray-800 text-sm font-medium">
                                            {store.name}
                                        </span>

                                        {/* Roles as styled chips */}
                                        {assignments[store.id] ? (
                                            <div className="flex gap-2 flex-wrap justify-end">
                                                {assignments[store.id].map(
                                                    (
                                                        assignment,
                                                        index: number
                                                    ) => (
                                                        <span
                                                            key={index}
                                                            className="flex items-center space-x-2"
                                                        >
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    assignment.role ===
                                                                    "manager"
                                                                        ? "bg-blue-100 text-blue-700"
                                                                        : assignment.role ===
                                                                          "seller"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-gray-100 text-gray-700"
                                                                }`}
                                                            >
                                                                {assignment.role
                                                                    .charAt(0)
                                                                    .toUpperCase() +
                                                                    assignment.role.slice(
                                                                        1
                                                                    )}
                                                            </span>
                                                            {assignment.isDefault && (
                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">
                                                No roles assigned
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !storesLoading && (
                                <span className="text-gray-500 text-sm">
                                    No stores assigned
                                </span>
                            )
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 font-semibold">
                                Member since:
                            </span>
                            <span className="text-gray-800">
                                {profile.createdAt
                                    ? new Date(
                                          profile.createdAt
                                      ).toLocaleDateString()
                                    : "N/A"}
                            </span>
                        </div>
                    </div>

                    {/* Admin Dashboard Button - Only visible to admins */}
                    {isAdmin && (
                        <div className="text-center">
                            <button
                                onClick={handleAdminDashboard}
                                className="w-full text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-1 border-blue-200 p-3 rounded-lg transition-colors"
                            >
                                Go to Admin Dashboard
                            </button>
                        </div>
                    )}

                    {/* Logout Button */}
                    <div className="text-center">
                        <button
                            onClick={handleLogout}
                            className="text-sm font-bold text-red-600 hover:text-red-800 border-1 p-2 px-6 rounded-full"
                        >
                            Log Out
                        </button>
                    </div>
                    <div className="mt-4 text-xs text-gray-500 text-center">
                        <VersionInfo />
                    </div>
                </div>
            </div>
        </div>
    );
}
