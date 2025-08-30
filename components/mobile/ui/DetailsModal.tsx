import { X } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";

interface DetailsModalProps {
    isOpen: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: any;
    onClose: () => void;
    productBreakdown: Record<string, { quantity: number; revenue: number }>;
    storeName: string;
}

export const DetailsModal = ({
    isOpen,
    summary,
    onClose,
    productBreakdown,
    storeName,
}: DetailsModalProps) => {
    if (!isOpen || !summary) return null;

    const formatFullTimestamp = (dateString: string) => {
        if (!dateString) return "Not set";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    const dailyCups = Object.values(productBreakdown).reduce(
        (total, product) => total + product.quantity,
        0
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">
                        Daily Summary Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Summary Header */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">
                            {new Date(summary.date).toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }
                            )}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>
                                <strong>Summary ID:</strong> {summary.id}
                            </p>
                            <p>
                                <strong>Store:</strong> {storeName}
                            </p>
                            <p>
                                <strong>Seller:</strong>{" "}
                                {summary.seller?.full_name}
                            </p>
                            {summary.manager?.full_name && (
                                <p>
                                    <strong>Manager:</strong>{" "}
                                    {summary.manager.full_name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-xs text-blue-600 uppercase tracking-wide">
                                Opening Balance
                            </p>
                            <p className="text-lg font-bold text-blue-800">
                                {formatRupiah(summary.opening_balance)}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-xs text-green-600 uppercase tracking-wide">
                                Total Sales
                            </p>
                            <p className="text-lg font-bold text-green-800">
                                {formatRupiah(summary.total_sales)}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-xs text-purple-600 uppercase tracking-wide">
                                Expected Cash
                            </p>
                            <p className="text-lg font-bold text-purple-800">
                                {formatRupiah(summary.expected_cash)}
                            </p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-xs text-orange-600 uppercase tracking-wide">
                                Actual Cash
                            </p>
                            <p className="text-lg font-bold text-orange-800">
                                {summary.actual_cash !== null
                                    ? formatRupiah(summary.actual_cash)
                                    : "Not counted"}
                            </p>
                        </div>
                    </div>

                    {/* Variance */}
                    {summary.variance !== null && (
                        <div
                            className={`p-4 rounded-lg ${
                                summary.variance >= 0
                                    ? "bg-green-50"
                                    : "bg-red-50"
                            }`}
                        >
                            <p
                                className={`text-xs uppercase tracking-wide ${
                                    summary.variance >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                }`}
                            >
                                Cash Variance
                            </p>
                            <p
                                className={`text-lg font-bold ${
                                    summary.variance >= 0
                                        ? "text-green-800"
                                        : "text-red-800"
                                }`}
                            >
                                {summary.variance >= 0 ? "+" : ""}
                                {formatRupiah(summary.variance)}
                            </p>
                        </div>
                    )}

                    {/* Sales Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                                {Object.keys(productBreakdown).length}
                            </p>
                            <p className="text-sm text-gray-600">
                                Total Orders
                            </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                                {dailyCups}
                            </p>
                            <p className="text-sm text-gray-600">Cups Sold</p>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-800">
                            Timestamps
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium">
                                    {formatFullTimestamp(summary.created_at)}
                                </span>
                            </div>
                            {summary.closed_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Closed:
                                    </span>
                                    <span className="font-medium">
                                        {formatFullTimestamp(summary.closed_at)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Breakdown */}
                    {Object.keys(productBreakdown).length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-800">
                                Product Sales
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(productBreakdown).map(
                                    ([productName, data]) => (
                                        <div
                                            key={productName}
                                            className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                                        >
                                            <span className="font-medium">
                                                {productName}
                                            </span>
                                            <div className="text-right">
                                                <p className="font-medium">
                                                    {data.quantity} cups
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {formatRupiah(data.revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {summary.notes && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-800">Notes</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    {summary.notes}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
