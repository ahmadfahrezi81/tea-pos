"use client";
import { useState } from "react";
import { CalendarDays, ChevronsUpDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import DailySalesChart from "./DailySalesChart";
import DayOfWeekChart from "./DayOfWeekChart";
import ProductSalesChart from "./ProductSalesChart";

const formatMonthForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

export default function MobileDailySales() {
    const { selectedStoreId, selectedStore, setIsPickerOpen } = useStore();
    const searchParams = useSearchParams();

    const [selectedMonth, setSelectedMonth] = useState(
        searchParams.get("month") || formatMonthForInput(new Date()),
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                    Monthly Chart
                </h1>
                {selectedStore && (
                    <button
                        onClick={() => setIsPickerOpen(true)}
                        className="flex items-center mt-1 gap-0.5"
                    >
                        <p className="text-lg text-blue-600/90 font-bold">
                            {selectedStore.name}
                        </p>
                        <ChevronsUpDown
                            size={14}
                            strokeWidth={3}
                            className="text-blue-600/90"
                        />
                    </button>
                )}
            </div>

            {/* Month Filter */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    Select Month
                </label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setSelectedMonth(
                            newValue === ""
                                ? formatMonthForInput(new Date())
                                : newValue,
                        );
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <DailySalesChart storeId={selectedStoreId} month={selectedMonth} />
            <DayOfWeekChart storeId={selectedStoreId} month={selectedMonth} />
            <ProductSalesChart
                storeId={selectedStoreId}
                month={selectedMonth}
            />
        </div>
    );
}
