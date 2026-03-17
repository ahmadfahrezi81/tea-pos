// "use client";
// import { useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useStores } from "@/lib/hooks/stores/useStores";
// import { useAuth } from "@/lib/context/AuthContext";
// import VersionInfo from "@/components/shared/VersionInfo";
// import { useRouter } from "next/navigation";
// import { useTenantSlug } from "@/lib/tenant-url";

// export default function MobileProfile() {
//     const supabase = createClient();
//     const router = useRouter();

//     const { url } = useTenantSlug();

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

//     // const handleAdminDashboard = useCallback(() => {
//     //     router.push(url("/admin/dashboard"));
//     // }, [router, url]);

//     const handleAdminDashboard = useCallback(() => {
//         window.open(url("/admin"), "_blank", "noopener,noreferrer");
//     }, [url]);

//     // Profile is guaranteed by middleware, but check for safety
//     if (!profile) {
//         return null;
//     }

//     // Check if user is admin - adjust this condition based on your profile structure
//     const isAdmin = profile.role === "ADMIN"; // Or profile.isAdmin, or however admin is stored

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

//                     {/* Admin Dashboard Button - Only visible to admins */}
//                     {isAdmin && (
//                         <div className="text-center">
//                             <button
//                                 onClick={handleAdminDashboard}
//                                 className="w-full text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-1 border-blue-200 p-3 rounded-lg transition-colors"
//                             >
//                                 Go to Admin Dashboard
//                             </button>
//                         </div>
//                     )}

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
import { useCallback, useState, useEffect } from "react";
import { hasSellerRoleInStore } from "@/lib/utils/roleUtils";
import { createClient } from "@/lib/supabase/client";
import { useStores } from "@/lib/hooks/stores/useStores";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@/lib/tenant-url";
import {
    Pencil,
    Store,
    Bell,
    Globe,
    Wrench,
    UserRound,
    Bot,
} from "lucide-react";
import { Icon } from "@iconify/react";

const ChevronRight = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-500"
    >
        <path d="M9 18l6-6-6-6" />
    </svg>
);
const SettingsRow = ({
    icon,
    label,
    onClick,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 py-4 border-b border-gray-100 last:border-none text-left ${
            disabled ? "opacity-40 cursor-default" : "active:bg-gray-50"
        }`}
    >
        <span className="text-xl w-6 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
            <p className="text-base text-gray-800">{label}</p>
        </div>
        {!disabled && <ChevronRight />}
    </button>
);

export default function MobileProfile() {
    const supabase = createClient();
    const router = useRouter();
    const { url } = useTenantSlug();
    const { profile } = useAuth();
    const { data: storesData, isLoading: storesLoading } = useStores();
    const stores = storesData?.stores ?? [];

    const [advancedMode, setAdvancedMode] = useState(false);

    const assignments = storesData?.assignments ?? {};
    const [selectedStore, setSelectedStore] = useState<string>("");

    const sellerStores = stores.filter((store) =>
        hasSellerRoleInStore(profile?.id ?? "", store.id, assignments),
    );

    const defaultStore = stores.find((store) =>
        assignments[store.id]?.some(
            (assignment) =>
                assignment.userId === profile?.id && assignment.isDefault,
        ),
    );

    useEffect(() => {
        if (defaultStore && !selectedStore) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, storesData]);

    const handleLogout = useCallback(async () => {
        const shouldLogout = window.confirm(
            "Are you sure you want to log out?",
        );
        if (shouldLogout) {
            await supabase.auth.signOut();
            router.push("/login");
        }
    }, [router, supabase]);

    const handleAdminDashboard = useCallback(() => {
        window.open(url("/admin"), "_blank", "noopener,noreferrer");
    }, [url]);

    const handleAssignedStores = useCallback(() => {
        router.push(url("/mobile/profile/stores"));
    }, [router, url]);

    if (!profile) return null;

    const isAdmin = profile.role === "ADMIN";

    const memberSince = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
          })
        : null;

    return (
        <div className="min-h-screen space-y-4">
            {/* Store Selector */}
            {sellerStores.length > 0 && (
                <div className="bg-white p-3 rounded-xl shadow-sm">
                    {/* <div className="flex items-center gap-2 mb-3">
                        <Store size={20} className="text-gray-600" />
                        <label className="block text-base font-semibold">
                            {sellerStores.length === 1
                                ? "Your Store"
                                : "Select Store"}
                        </label>
                    </div> */}
                    <select
                        disabled={sellerStores.length === 1}
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:ring-2 ${
                            sellerStores.length === 1
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                                : "border-gray-300 focus:ring-blue-500"
                        }`}
                    >
                        {sellerStores.map((store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                {/* Profile Header */}
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Bot size={30} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xl font-semibold text-gray-900 leading-tight truncate">
                            {profile.fullName}
                        </p>
                        <p className="text-sm text-gray-900 truncate mt-0.5">
                            {profile.email}
                        </p>
                        {memberSince && (
                            <p className="text-xs text-gray-500">
                                Member since {memberSince}
                            </p>
                        )}
                    </div>
                </div>

                {/* Advanced Mode Toggle */}
                <div className="rounded-lg p-4 flex items-center gap-3 bg-gray-50">
                    {/* <span className="text-xl w-6 text-center">⚡</span> */}
                    <Icon icon="fluent-emoji:rocket" width="40" height="40" />

                    <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">
                            Fast Order Mode
                        </p>
                        <p className="text-xs text-gray-500">For power users</p>
                    </div>
                    <button
                        onClick={() => setAdvancedMode((v) => !v)}
                        className={`relative w-13 h-8 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                            advancedMode ? "bg-blue-500" : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-200 ${
                                advancedMode ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Settings Sections */}
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Account Settings
            </h3>
            <div className="bg-white rounded-xl p-4 py-2 space-y-1 shadow-sm">
                <SettingsRow
                    icon={<Pencil size={24} className="text-gray-900" />}
                    label="Personal Details"
                    disabled
                />
                <SettingsRow
                    icon={<Store size={24} className="text-gray-900" />}
                    label={`Assigned Stores (${stores.length} ${stores.length !== 1 ? "Stores" : "Store"})`}
                    onClick={handleAssignedStores}
                />
                <SettingsRow
                    icon={<Bell size={24} className="text-gray-900" />}
                    label="Notifications"
                    disabled
                />
                <SettingsRow
                    icon={<Globe size={24} className="text-gray-900" />}
                    label="Language"
                    disabled
                />
                {isAdmin && (
                    <SettingsRow
                        icon={<Wrench size={24} className="text-gray-900" />}
                        label="Admin Dashboard"
                        onClick={handleAdminDashboard}
                    />
                )}
            </div>

            {/* Logout + Version */}
            <div className="mt-8 pb-10 flex flex-col items-center gap-2">
                <div className="text-gray-900">
                    <VersionInfo />
                </div>
                <button
                    onClick={handleLogout}
                    className="text-sm font-semibold text-red-500 py-2 px-6"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
