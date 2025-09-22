// components/ProductsSearchFilter.tsx
import React, { useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { ProductStatus } from "../hooks/useProductFilters";

interface ProductsSearchFilterProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedStatus: ProductStatus;
    onStatusFilterChange: (status: ProductStatus) => void;
    totalProducts: number;
    filteredProductsCount: number;
}

export const ProductsSearchFilter: React.FC<ProductsSearchFilterProps> = ({
    searchQuery,
    onSearchChange,
    selectedStatus,
    onStatusFilterChange,
    totalProducts,
    filteredProductsCount,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const statusOptions = [
        { value: "all" as ProductStatus, label: "All Products" },
        { value: "active" as ProductStatus, label: "Active" },
        { value: "inactive" as ProductStatus, label: "Inactive" },
    ];

    const selectedStatusOption = statusOptions.find(
        (option) => option.value === selectedStatus
    );

    const handleStatusSelect = (status: ProductStatus) => {
        onStatusFilterChange(status);
        setIsDropdownOpen(false);
    };

    const clearFilters = () => {
        onSearchChange("");
        onStatusFilterChange("all");
    };

    const hasActiveFilters = searchQuery || selectedStatus !== "all";

    return (
        <div className="rounded-lg space-y-2">
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search products by name..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-2xs pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                </div>

                {/* Status Filter Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-42 flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <span className="truncate">
                            {selectedStatusOption?.label || "All Products"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    </button>

                    {isDropdownOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />

                            {/* Dropdown */}
                            <div
                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-auto p-2 space-y-1"
                                style={{
                                    overflowY: "auto",
                                    scrollbarWidth: "none", // Firefox
                                    msOverflowStyle: "none", // IE 10+, Edge
                                }}
                            >
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() =>
                                            handleStatusSelect(option.value)
                                        }
                                        className={`w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded ${
                                            selectedStatus === option.value
                                                ? "bg-blue-50 text-blue-700 font-medium"
                                                : "text-gray-700"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between text-xs text-gray-600">
                <div>
                    Showing {filteredProductsCount} of {totalProducts} products
                    {selectedStatus !== "all" && (
                        <span className="ml-2">
                            • Status:{" "}
                            <span className="font-medium text-gray-800">
                                {selectedStatusOption?.label}
                            </span>
                        </span>
                    )}
                </div>

                {hasActiveFilters && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {(searchQuery ? 1 : 0) +
                                (selectedStatus !== "all" ? 1 : 0)}{" "}
                            filter(s) active
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
