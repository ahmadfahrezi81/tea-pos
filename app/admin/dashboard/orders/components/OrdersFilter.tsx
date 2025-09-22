// components/OrdersFilter.tsx
import React, { useState } from "react";
import {
    Search,
    Calendar,
    Store as StoreIcon,
    ChevronDown,
    X,
} from "lucide-react";
import { Store } from "../types/orders";

interface OrdersFilterProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    selectedStoreIds: string[];
    onStoreSelectionChange: (storeIds: string[]) => void;
    orderIdSearch: string;
    onOrderIdSearchChange: (search: string) => void;
    stores: Store[];
    totalOrders: number;
    filteredOrdersCount: number;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
}

export const OrdersFilter: React.FC<OrdersFilterProps> = ({
    selectedDate,
    onDateChange,
    selectedStoreIds,
    onStoreSelectionChange,
    orderIdSearch,
    onOrderIdSearchChange,
    stores,
    totalOrders,
    filteredOrdersCount,
    onClearFilters,
    hasActiveFilters,
}) => {
    const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

    const handleStoreToggle = (storeId: string) => {
        if (selectedStoreIds.includes(storeId)) {
            onStoreSelectionChange(
                selectedStoreIds.filter((id) => id !== storeId)
            );
        } else {
            onStoreSelectionChange([...selectedStoreIds, storeId]);
        }
    };

    const getStoreSelectionText = () => {
        if (selectedStoreIds.length === 0) {
            return "All Stores";
        } else if (selectedStoreIds.length === 1) {
            const store = stores.find((s) => s.id === selectedStoreIds[0]);
            return store?.name || "1 Store";
        } else {
            return `${selectedStoreIds.length} Stores`;
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Date
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Store Multi-Select */}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <StoreIcon className="inline w-4 h-4 mr-1" />
                        Stores
                    </label>
                    <button
                        onClick={() =>
                            setIsStoreDropdownOpen(!isStoreDropdownOpen)
                        }
                        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <span className="truncate">
                            {getStoreSelectionText()}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    </button>

                    {isStoreDropdownOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsStoreDropdownOpen(false)}
                            />

                            {/* Dropdown */}
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-auto p-2 space-y-1">
                                {/* Select All / Deselect All */}
                                <div className="border-b border-gray-100 pb-2 mb-2">
                                    <button
                                        onClick={() => {
                                            if (
                                                selectedStoreIds.length ===
                                                stores.length
                                            ) {
                                                onStoreSelectionChange([]);
                                            } else {
                                                onStoreSelectionChange(
                                                    stores.map((s) => s.id)
                                                );
                                            }
                                        }}
                                        className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        {selectedStoreIds.length ===
                                        stores.length
                                            ? "Deselect All"
                                            : "Select All"}
                                    </button>
                                </div>

                                {stores.map((store) => (
                                    <label
                                        key={store.id}
                                        className="flex items-center px-2 py-1 text-sm hover:bg-gray-50 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStoreIds.includes(
                                                store.id
                                            )}
                                            onChange={() =>
                                                handleStoreToggle(store.id)
                                            }
                                            className="mr-2 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="flex-1">
                                            {store.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Order ID Search */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Search className="inline w-4 h-4 mr-1" />
                        Order ID Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by Order ID..."
                            value={orderIdSearch}
                            onChange={(e) =>
                                onOrderIdSearchChange(e.target.value)
                            }
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Clear Filters and Results Summary */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                    Showing {filteredOrdersCount} of {totalOrders} orders
                    {selectedStoreIds.length > 0 &&
                        selectedStoreIds.length < stores.length && (
                            <span className="ml-2">
                                • {selectedStoreIds.length} of {stores.length}{" "}
                                stores selected
                            </span>
                        )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Clear all filters
                    </button>
                )}
            </div>
        </div>
    );
};
