// "use client";
// import { useStores } from "@/lib/client/hooks/stores/useStores";
// import { useAuth } from "@/lib/client/context/AuthContext";

// export default function MobileProfileStores() {
//     const { profile } = useAuth();
//     const { data: storeData, isLoading } = useStores();
//     const stores = storeData?.stores ?? [];
//     const assignments = storeData?.assignments ?? {};

//     const myStores = stores.filter((store) =>
//         assignments[store.id]?.some((a) => a.userId === profile?.id),
//     );

//     return (
//         <div className="space-y-4">
//             <div className="bg-white rounded-xl p-5 shadow-sm">
//                 <div className="bg-gray-50 py-1 px-2 rounded-lg border border-gray-200 text-gray-800">
//                     {isLoading && (
//                         <span className="text-gray-500 text-sm">
//                             Loading...
//                         </span>
//                     )}

//                     {!isLoading && myStores.length > 0 ? (
//                         <div>
//                             {myStores.map((store) => (
//                                 <div
//                                     key={store.id}
//                                     className="flex justify-between items-center border-b border-gray-300 last:border-none py-2"
//                                 >
//                                     <span className="text-gray-800 text-sm font-medium">
//                                         {store.name}
//                                     </span>

//                                     {assignments[store.id] ? (
//                                         <div className="flex gap-2 flex-wrap justify-end">
//                                             {assignments[store.id].map(
//                                                 (assignment, index: number) => (
//                                                     <span
//                                                         key={index}
//                                                         className="flex items-center space-x-2"
//                                                     >
//                                                         <span
//                                                             className={`px-2 py-1 rounded-full text-xs font-medium ${
//                                                                 assignment.role ===
//                                                                 "manager"
//                                                                     ? "bg-blue-100 text-blue-700"
//                                                                     : assignment.role ===
//                                                                         "seller"
//                                                                       ? "bg-green-100 text-green-700"
//                                                                       : "bg-gray-100 text-gray-700"
//                                                             }`}
//                                                         >
//                                                             {assignment.role
//                                                                 .charAt(0)
//                                                                 .toUpperCase() +
//                                                                 assignment.role.slice(
//                                                                     1,
//                                                                 )}
//                                                         </span>
//                                                         {assignment.isDefault && (
//                                                             <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                                                                 Default
//                                                             </span>
//                                                         )}
//                                                     </span>
//                                                 ),
//                                             )}
//                                         </div>
//                                     ) : (
//                                         <span className="text-xs text-gray-400">
//                                             No roles assigned
//                                         </span>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     ) : (
//                         !isLoading && (
//                             <span className="text-gray-500 text-sm">
//                                 No stores assigned
//                             </span>
//                         )
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }

"use client";
import { useStores } from "@/lib/client/hooks/stores/useStores";

export default function MobileProfileStores() {
    const { data: storeData, isLoading } = useStores();
    const stores = storeData?.stores ?? [];
    const assignments = storeData?.assignments ?? {};

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="bg-gray-50 py-1 px-2 rounded-lg border border-gray-200 text-gray-800">
                    {isLoading && (
                        <span className="text-gray-500 text-sm">
                            Loading...
                        </span>
                    )}

                    {!isLoading && stores.length > 0 ? (
                        <div>
                            {stores.map((store) => (
                                <div
                                    key={store.id}
                                    className="flex justify-between items-center border-b border-gray-300 last:border-none py-2"
                                >
                                    <span className="text-gray-800 text-sm font-medium">
                                        {store.name}
                                    </span>

                                    {assignments[store.id] ? (
                                        <div className="flex gap-2 flex-wrap justify-end">
                                            {assignments[store.id].map(
                                                (assignment, index: number) => (
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
                                                                    1,
                                                                )}
                                                        </span>
                                                        {assignment.isDefault && (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                Default
                                                            </span>
                                                        )}
                                                    </span>
                                                ),
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
                        !isLoading && (
                            <span className="text-gray-500 text-sm">
                                No stores assigned
                            </span>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
