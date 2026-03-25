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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
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
