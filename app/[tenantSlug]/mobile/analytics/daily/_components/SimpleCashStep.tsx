// "use client";

// import { useState, useEffect } from "react";
// import { Check } from "lucide-react";
// import { formatRupiah } from "@/lib/shared/utils/cn/formatCurrency";

// interface SimpleCashStepProps {
//     expectedCash: number;
//     initialValue?: number;
//     onActualCashChange: (amount: number) => void;
//     onConfirmedChange: (confirmed: boolean) => void;
// }

// export function SimpleCashStep({
//     expectedCash,
//     initialValue,
//     onActualCashChange,
//     onConfirmedChange,
// }: SimpleCashStepProps) {
//     const seedValue = initialValue ?? expectedCash;
//     const wasAlreadySaved = initialValue != null && initialValue > 0;

//     const [localValue, setLocalValue] = useState<string>(String(seedValue));
//     const [confirmed, setConfirmed] = useState(wasAlreadySaved);

//     // Sync parent on mount
//     useEffect(() => {
//         onActualCashChange(seedValue);
//         if (wasAlreadySaved) onConfirmedChange(true);
//     }, []);

//     const actualCash = parseFloat(localValue) || 0;
//     const variance = actualCash - expectedCash;
//     const isExact = variance === 0;
//     const isOver = variance > 0;

//     const handleChange = (raw: string) => {
//         setLocalValue(raw);
//         const val = parseFloat(raw);
//         if (!isNaN(val)) onActualCashChange(val);
//     };

//     const handleConfirm = () => {
//         const next = !confirmed;
//         setConfirmed(next);
//         onConfirmedChange(next);
//     };

//     return (
//         <div className="flex flex-col gap-4">
//             <div>
//                 <h2 className="text-xl font-semibold text-gray-900">
//                     Count the Cash
//                 </h2>
//                 <p className="text-sm text-gray-500 mt-0.5">
//                     Enter the actual cash amount you counted.
//                 </p>
//             </div>

//             <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2">
//                 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
//                     Actual Cash
//                 </p>
//                 <input
//                     type="number"
//                     inputMode="numeric"
//                     value={localValue}
//                     onChange={(e) => handleChange(e.target.value)}
//                     className="text-3xl font-bold text-gray-900 border-none outline-none bg-transparent w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
//                 />
//                 <p className="text-xs text-gray-400">
//                     Expected: {formatRupiah(expectedCash)}
//                 </p>
//             </div>

//             <div
//                 className={`p-4 rounded-2xl ${
//                     isExact
//                         ? "bg-green-50"
//                         : isOver
//                           ? "bg-blue-50"
//                           : "bg-red-50"
//                 }`}
//             >
//                 <p
//                     className={`text-xs font-semibold uppercase tracking-wide ${
//                         isExact
//                             ? "text-green-600"
//                             : isOver
//                               ? "text-blue-600"
//                               : "text-red-600"
//                     }`}
//                 >
//                     Variance
//                 </p>
//                 <p
//                     className={`text-2xl font-bold mt-1 ${
//                         isExact
//                             ? "text-green-600"
//                             : isOver
//                               ? "text-blue-600"
//                               : "text-red-600"
//                     }`}
//                 >
//                     {variance >= 0 ? "+" : ""}
//                     {formatRupiah(variance)}
//                 </p>
//                 <p
//                     className={`text-xs mt-1 ${
//                         isExact
//                             ? "text-green-500"
//                             : isOver
//                               ? "text-blue-500"
//                               : "text-red-500"
//                     }`}
//                 >
//                     {isExact
//                         ? "Cash matches perfectly"
//                         : isOver
//                           ? `Over by ${formatRupiah(Math.abs(variance))}`
//                           : `Short by ${formatRupiah(Math.abs(variance))}`}
//                 </p>
//             </div>

//             <button
//                 onClick={handleConfirm}
//                 className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 w-full text-left"
//             >
//                 <div
//                     className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
//                         confirmed ? "bg-brand border-brand" : "border-gray-300"
//                     }`}
//                 >
//                     {confirmed && <Check size={12} className="text-white" />}
//                 </div>
//                 <p className="text-sm text-gray-700 font-medium">
//                     I confirm the cash amount is correct.
//                 </p>
//             </button>

//             <div className="h-4" />
//         </div>
//     );
// }

"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { formatRupiah } from "@/lib/shared/utils/formatCurrency";

interface SimpleCashStepProps {
    expectedCash: number;
    initialValue?: number;
    onActualCashChange: (amount: number) => void;
    onConfirmedChange: (confirmed: boolean) => void;
}

const formatDisplay = (val: number) =>
    val === 0 ? "" : val.toLocaleString("id-ID");

export function SimpleCashStep({
    expectedCash,
    initialValue,
    onActualCashChange,
    onConfirmedChange,
}: SimpleCashStepProps) {
    const seedValue = initialValue ?? expectedCash;
    const wasAlreadySaved = initialValue != null && initialValue > 0;

    const [localValue, setLocalValue] = useState<string>(
        formatDisplay(seedValue),
    );
    const [confirmed, setConfirmed] = useState(wasAlreadySaved);

    useEffect(() => {
        onActualCashChange(seedValue);
        if (wasAlreadySaved) onConfirmedChange(true);
    }, []);

    const actualCash = parseInt(localValue.replace(/\D/g, "")) || 0;
    const variance = actualCash - expectedCash;
    const isExact = variance === 0;
    const isOver = variance > 0;

    const handleChange = (raw: string) => {
        const digits = raw.replace(/\D/g, "");
        const num = parseInt(digits) || 0;
        setLocalValue(formatDisplay(num));
        onActualCashChange(num);
    };

    const handleConfirm = () => {
        const next = !confirmed;
        setConfirmed(next);
        onConfirmedChange(next);
    };

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">
                    Count the Cash
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Enter the actual cash amount you counted.
                </p>
            </div>

            <div className="bg-white p-4 flex flex-col gap-8 rounded-2xl">
                <div className="bg-white rounded-2xl flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                        Actual Cash
                    </p>
                    <div className="p-6 px-3 border border-gray-100 rounded-2xl bg-gray-50">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={localValue}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder="0"
                            className="text-4xl font-bold text-gray-900 border-none outline-none bg-transparent w-full"
                        />
                    </div>
                    <p className="text-sm text-gray-600">
                        Expected: {formatRupiah(expectedCash)}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                        Variance
                    </p>
                    <div
                        className={`p-4 rounded-2xl ${
                            isExact
                                ? "bg-green-50"
                                : isOver
                                  ? "bg-blue-50"
                                  : "bg-red-50"
                        }`}
                    >
                        <p
                            className={`text-2xl font-bold mt-1 ${
                                isExact
                                    ? "text-green-600"
                                    : isOver
                                      ? "text-blue-600"
                                      : "text-red-600"
                            }`}
                        >
                            {variance >= 0 ? "+" : ""}
                            {formatRupiah(variance)}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">
                        {isExact
                            ? "Cash matches perfectly"
                            : isOver
                              ? `Over by ${formatRupiah(Math.abs(variance))}`
                              : `Short by ${formatRupiah(Math.abs(variance))}`}
                    </p>
                </div>
            </div>

            <button
                onClick={handleConfirm}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl w-full text-left"
            >
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        confirmed ? "bg-brand border-brand" : "border-gray-300"
                    }`}
                >
                    {confirmed && <Check size={12} className="text-white" />}
                </div>
                <p className="text-sm text-gray-700 font-medium">
                    I confirm the cash amount is correct.
                </p>
            </button>

            <div className="h-4" />
        </div>
    );
}
