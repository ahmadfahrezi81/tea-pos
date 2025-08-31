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

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DailySummary } from "@/lib/types";

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
        opening_balance: "",
    });

    useEffect(() => {
        if (summary?.opening_balance != null) {
            setEditForm({
                opening_balance: summary.opening_balance.toString(),
            });
        }
    }, [summary?.opening_balance]); // this will run each time opening_balance updates

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        // Cleanup function to restore scrolling when component unmounts
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen || !summary) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const openingBalance = parseFloat(editForm.opening_balance);
        await onSubmit(openingBalance);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            onClick={onClose}
        >
            <div
                className="bg-white w-full rounded-t-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Fixed Header */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col space-y-1">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Set Opening Balance
                            </h2>
                            <p className="text-md text-gray-600">
                                {formatDate(summary.date)} · {getStoreName()}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Opening Balance
                            </label>
                            <input
                                type="number"
                                step="100"
                                inputMode="numeric"
                                min={0}
                                value={editForm.opening_balance}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        opening_balance: e.target.value,
                                    })
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This will update the expected cash automatically
                            </p>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer with Submit Button */}
                <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-200">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="w-full bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-colors"
                    >
                        Update Opening Balance
                    </button>
                </div>
            </div>
        </div>
    );
};
