// components/OrdersSummary.tsx
import React from "react";
import { Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { OrdersSummary } from "../types/orders";

interface OrdersSummaryProps {
    summary: OrdersSummary;
}

const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export const OrdersSummaryComponent: React.FC<OrdersSummaryProps> = ({
    summary,
}) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Receipt size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                    Daily Summary
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                        <Receipt size={24} className="text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-1">
                        {summary.totalOrders}
                    </p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                        <ShoppingCart size={24} className="text-orange-600" />
                    </div>
                    <p className="text-3xl font-bold text-orange-600 mb-1">
                        {summary.totalCups}
                    </p>
                    <p className="text-sm text-gray-600">Total Cups</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                        <TrendingUp size={24} className="text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600 mb-1">
                        {formatRupiah(summary.totalSales)}
                    </p>
                    <p className="text-sm text-gray-600">Total Sales</p>
                </div>
            </div>
        </div>
    );
};
