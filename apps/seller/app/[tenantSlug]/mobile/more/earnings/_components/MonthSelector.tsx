"use client";

import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthSelector({
    month,
    onChange,
}: {
    month: Date;
    onChange: (month: Date) => void;
}) {
    return (
        <div className="flex items-center justify-between bg-white rounded-xl px-2 py-1.5">
            <button
                onClick={() => onChange(subMonths(month, 1))}
                className="p-1.5 rounded-full active:bg-gray-100 text-gray-500"
            >
                <ChevronLeft size={24} />
            </button>
            <p className="text-lg font-semibold text-gray-900">{format(month, "MMMM yyyy")}</p>
            <button
                onClick={() => onChange(addMonths(month, 1))}
                className="p-1.5 rounded-full active:bg-gray-100 text-gray-500"
            >
                <ChevronRight size={24} />
            </button>
        </div>
    );
}
