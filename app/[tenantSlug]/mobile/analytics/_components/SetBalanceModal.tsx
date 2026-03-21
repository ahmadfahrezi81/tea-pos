// import { useEffect, useState } from "react";
// import { X } from "lucide-react";
// import { DailySummary } from "@/lib/types";

// interface SetBalanceModalProps {
//     isOpen: boolean;
//     summary: DailySummary;
//     onClose: () => void;
//     onSubmit: (openingBalance: number) => Promise<void>;
//     formatDate: (date: string) => string;
//     getStoreName: () => string;
// }

// export const SetBalanceModal = ({
//     isOpen,
//     summary,
//     onClose,
//     onSubmit,
//     formatDate,
//     getStoreName,
// }: SetBalanceModalProps) => {
//     const [editForm, setEditForm] = useState({
//         opening_balance: "",
//     });

//     useEffect(() => {
//         if (summary?.opening_balance != null) {
//             setEditForm({
//                 opening_balance: summary.opening_balance.toString(),
//             });
//         }
//     }, [summary?.opening_balance]); // this will run each time opening_balance updates

//     if (!isOpen || !summary) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         const openingBalance = parseFloat(editForm.opening_balance);
//         await onSubmit(openingBalance);
//         onClose();
//     };

//     return (
//         <div
//             className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//             onClick={onClose}
//         >
//             <div
//                 className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                 onClick={(e) => e.stopPropagation()}
//             >
//                 <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                     <div className="flex flex-col space-y-1">
//                         <h2 className="text-xl font-semibold text-gray-900">
//                             Set Opening Balance
//                         </h2>
//                         <p className="text-sm text-gray-600">
//                             {formatDate(summary.date)} · {getStoreName()}
//                         </p>
//                     </div>

//                     <button
//                         onClick={onClose}
//                         className="p-1 hover:bg-gray-100 rounded"
//                     >
//                         <X size={24} />
//                     </button>
//                 </div>

//                 <form onSubmit={handleSubmit} className="p-4 space-y-4">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Opening Balance
//                         </label>
//                         <input
//                             type="number"
//                             step="100"
//                             inputMode="numeric"
//                             min={0}
//                             value={editForm.opening_balance}
//                             onChange={(e) =>
//                                 setEditForm({
//                                     ...editForm,
//                                     opening_balance: e.target.value,
//                                 })
//                             }
//                             className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                             placeholder="0"
//                             required
//                         />
//                         <p className="text-xs text-gray-500 mt-1">
//                             This will update the expected cash automatically
//                         </p>
//                     </div>

//                     <button
//                         type="submit"
//                         className="w-full bg-blue-500 text-white py-4 mb-4 rounded-xl font-semibold hover:bg-blue-600"
//                     >
//                         Update Opening Balance
//                     </button>
//                 </form>
//             </div>
//         </div>
//     );
// };

// //components/SetBalanceModal.tsx
// import { useEffect, useState } from "react";
// import { X } from "lucide-react";
// import { DailySummary } from "@/lib/types";

// interface SetBalanceModalProps {
//     isOpen: boolean;
//     summary: DailySummary;
//     onClose: () => void;
//     onSubmit: (openingBalance: number) => Promise<void>;
//     formatDate: (date: string) => string;
//     getStoreName: () => string;
// }

// export const SetBalanceModal = ({
//     isOpen,
//     summary,
//     onClose,
//     onSubmit,
//     formatDate,
//     getStoreName,
// }: SetBalanceModalProps) => {
//     const [editForm, setEditForm] = useState({
//         opening_balance: "",
//     });

//     useEffect(() => {
//         if (summary?.opening_balance != null) {
//             setEditForm({
//                 opening_balance: summary.opening_balance.toString(),
//             });
//         }
//     }, [summary?.opening_balance]); // this will run each time opening_balance updates

//     // Prevent background scrolling when modal is open
//     useEffect(() => {
//         if (isOpen) {
//             document.body.style.overflow = "hidden";
//         } else {
//             document.body.style.overflow = "unset";
//         }

//         // Cleanup function to restore scrolling when component unmounts
//         return () => {
//             document.body.style.overflow = "unset";
//         };
//     }, [isOpen]);

//     if (!isOpen || !summary) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         const openingBalance = parseFloat(editForm.opening_balance);
//         await onSubmit(openingBalance);
//         onClose();
//     };

//     return (
//         <div
//             className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//             onClick={onClose}
//         >
//             <div
//                 className="bg-white w-full rounded-t-2xl max-h-[90vh] flex flex-col"
//                 onClick={(e) => e.stopPropagation()}
//             >
//                 {/* Fixed Header */}
//                 <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
//                     <div className="flex justify-between items-center">
//                         <div className="flex flex-col space-y-1">
//                             <h2 className="text-xl font-semibold text-gray-900">
//                                 Set Opening Balance
//                             </h2>
//                             <p className="text-md text-gray-600">
//                                 {formatDate(summary.date)} · {getStoreName()}
//                             </p>
//                         </div>

//                         <button
//                             onClick={onClose}
//                             className="p-1 hover:bg-gray-100 rounded"
//                         >
//                             <X size={24} />
//                         </button>
//                     </div>
//                 </div>

//                 {/* Scrollable Content */}
//                 <div className="flex-1 overflow-y-auto">
//                     <div className="p-4 space-y-4">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Opening Balance
//                             </label>
//                             {/* <input
//                                 type="number"
//                                 step="100"
//                                 inputMode="numeric"
//                                 min={0}
//                                 value={editForm.opening_balance}
//                                 onChange={(e) =>
//                                     setEditForm({
//                                         ...editForm,
//                                         opening_balance: e.target.value,
//                                     })
//                                 }
//                                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                 placeholder="0"
//                                 required
//                             /> */}
//                             <input
//                                 type="number"
//                                 step="100"
//                                 inputMode="numeric"
//                                 min={0}
//                                 value={editForm.opening_balance}
//                                 onChange={(e) => {
//                                     const val = e.target.value;
//                                     // Clean and validate input
//                                     if (val === "") {
//                                         setEditForm({
//                                             ...editForm,
//                                             opening_balance: "",
//                                         });
//                                     } else if (/^\d+$/.test(val)) {
//                                         setEditForm({
//                                             ...editForm,
//                                             opening_balance: String(
//                                                 Number(val)
//                                             ),
//                                         });
//                                     }
//                                 }}
//                                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                 placeholder="0"
//                                 required
//                             />
//                             <p className="text-xs text-gray-500 mt-1">
//                                 This will update the expected cash automatically
//                             </p>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Fixed Footer with Submit Button */}
//                 <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-200">
//                     <button
//                         type="submit"
//                         onClick={handleSubmit}
//                         className="w-full bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-colors"
//                     >
//                         Update Opening Balance
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // components/mobile/components/SetBalanceModal.tsx
// import { useEffect, useState } from "react";
// import { X } from "lucide-react";
// import { DailySummary } from "@/lib/schemas/daily-summaries";

// interface SetBalanceModalProps {
//     isOpen: boolean;
//     summary: DailySummary;
//     onClose: () => void;
//     onSubmit: (openingBalance: number) => Promise<void>;
//     formatDate: (date: string) => string;
//     getStoreName: () => string;
// }

// export const SetBalanceModal = ({
//     isOpen,
//     summary,
//     onClose,
//     onSubmit,
//     formatDate,
//     getStoreName,
// }: SetBalanceModalProps) => {
//     const [editForm, setEditForm] = useState({
//         openingBalance: "",
//     });

//     useEffect(() => {
//         if (summary?.openingBalance != null) {
//             setEditForm({
//                 openingBalance: summary.openingBalance.toString(),
//             });
//         }
//     }, [summary?.openingBalance]);

//     // Prevent background scrolling when modal is open
//     useEffect(() => {
//         if (isOpen) {
//             document.body.style.overflow = "hidden";
//         } else {
//             document.body.style.overflow = "unset";
//         }

//         return () => {
//             document.body.style.overflow = "unset";
//         };
//     }, [isOpen]);

//     if (!isOpen || !summary) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         const openingBalance = parseFloat(editForm.openingBalance);
//         await onSubmit(openingBalance);
//         onClose();
//     };

//     return (
//         <div
//             className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//             onClick={onClose}
//         >
//             <div
//                 className="bg-white w-full rounded-t-2xl max-h-[90vh] flex flex-col"
//                 onClick={(e) => e.stopPropagation()}
//             >
//                 {/* Fixed Header */}
//                 <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
//                     <div className="flex justify-between items-center">
//                         <div className="flex flex-col space-y-1">
//                             <h2 className="text-xl font-semibold text-gray-900">
//                                 Set Opening Balance
//                             </h2>
//                             <p className="text-md text-gray-600">
//                                 {formatDate(summary.date)} · {getStoreName()}
//                             </p>
//                         </div>

//                         <button
//                             onClick={onClose}
//                             className="p-1 hover:bg-gray-100 rounded"
//                         >
//                             <X size={24} />
//                         </button>
//                     </div>
//                 </div>

//                 {/* Scrollable Content */}
//                 <div className="flex-1 overflow-y-auto">
//                     <div className="p-4 space-y-4">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Opening Balance
//                             </label>
//                             <input
//                                 type="number"
//                                 step="100"
//                                 inputMode="numeric"
//                                 min={0}
//                                 value={editForm.openingBalance}
//                                 onChange={(e) => {
//                                     const val = e.target.value;
//                                     if (val === "") {
//                                         setEditForm({
//                                             ...editForm,
//                                             openingBalance: "",
//                                         });
//                                     } else if (/^\d+$/.test(val)) {
//                                         setEditForm({
//                                             ...editForm,
//                                             openingBalance: String(Number(val)),
//                                         });
//                                     }
//                                 }}
//                                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                 placeholder="0"
//                                 required
//                             />
//                             <p className="text-xs text-gray-500 mt-1">
//                                 This will update the expected cash automatically
//                             </p>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Fixed Footer with Submit Button */}
//                 <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-200">
//                     <button
//                         type="submit"
//                         onClick={handleSubmit}
//                         className="w-full bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-colors"
//                     >
//                         Update Opening Balance
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// components/mobile/components/SetBalanceModal.tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";
import { DailySummary } from "@/lib/schemas/daily-summaries";

interface SetBalanceModalProps {
    isOpen: boolean;
    summary: DailySummary;
    onClose: () => void;
    onSubmit: (openingBalance: number) => Promise<void>;
    formatDate: (date: string) => string;
    getStoreName: () => string;
}

export const SetBalanceModal = ({
    isOpen,
    summary,
    onClose,
    onSubmit,
    formatDate,
    getStoreName,
}: SetBalanceModalProps) => {
    const [editForm, setEditForm] = useState({
        openingBalance: "",
    });

    useEffect(() => {
        if (summary?.openingBalance != null) {
            setEditForm({
                openingBalance: summary.openingBalance.toString(),
            });
        }
    }, [summary?.openingBalance]);

    if (!summary) return null;

    const handleSubmit = async () => {
        const openingBalance = parseFloat(editForm.openingBalance);
        await onSubmit(openingBalance);
        onClose();
    };

    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    const scrollY = window.scrollY;
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollY);
                    });
                    onClose();
                }
            }}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl focus:outline-none max-h-[90vh] flex flex-col">
                    {/* Pull tab */}
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-10 h-1 rounded-full bg-gray-400" />
                    </div>

                    {/* Header */}
                    <div className="flex-shrink-0 px-4 pt-6 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col space-y-0.5">
                                <Drawer.Title className="text-xl font-bold text-gray-900">
                                    Set Opening Balance
                                </Drawer.Title>
                                <p className="text-sm text-gray-500">
                                    {formatDate(summary.date)} ·{" "}
                                    {getStoreName()}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                            >
                                <X size={26} />
                            </button>
                        </div>
                        <div className="h-px bg-gray-200 -mx-4" />
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-4 pt-2 pb-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Opening Balance
                                </label>
                                <input
                                    type="number"
                                    step="100"
                                    inputMode="numeric"
                                    min={0}
                                    value={editForm.openingBalance}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                            setEditForm({
                                                ...editForm,
                                                openingBalance: "",
                                            });
                                        } else if (/^\d+$/.test(val)) {
                                            setEditForm({
                                                ...editForm,
                                                openingBalance: String(
                                                    Number(val),
                                                ),
                                            });
                                        }
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will update the expected cash
                                    automatically
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 bg-white px-4 pt-4 pb-8 border-t border-gray-200">
                        <button
                            onClick={handleSubmit}
                            className="w-full bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-colors"
                        >
                            Update Opening Balance
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};
