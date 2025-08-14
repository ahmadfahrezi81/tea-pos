// app/dashboard/analytics/page.tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";

interface DailySummary {
    id: string;
    store_id: string;
    seller_id: string;
    manager_id: string | null;
    date: string;
    opening_balance: number;
    total_sales: number;
    expected_cash: number;
    actual_cash: number | null;
    variance: number | null;
    closed_at: string | null;
    notes: string | null;
    created_at: string;
    stores?: { name: string };
    seller?: { full_name: string };
}

// interface Store {
//     id: string;
//     name: string;
// }

// interface Seller {
//     id: string;
//     full_name: string;
// }

export default function AnalyticsPage() {
    // const [summaries, setSummaries] = useState<DailySummary[]>([]);
    // const [stores, setStores] = useState<Store[]>([]);
    // const [sellers, setSellers] = useState<Seller[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    // const [loading, setLoading] = useState(true);
    const [showOpeningForm, setShowOpeningForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
        null
    );
    const [openingForm, setOpeningForm] = useState({
        store_id: "",
        seller_id: "",
        opening_balance: "",
        date: "",
    });
    const [closeForm, setCloseForm] = useState({
        actual_cash: "",
        notes: "",
    });
    const supabase = createClient();

    const {
        stores = [],
        sellers = [],
        summaries = [],
        isLoading,
        mutate,
    } = useAnalyticsData(selectedStore, selectedDate);

    // useEffect(() => {
    //     loadInitialData();
    // }, []);

    // useEffect(() => {
    //     if (selectedStore) {
    //         loadSummaries();
    //         console.log("[TEST] - I'm from useEffect");
    //     }
    // }, [selectedStore, selectedDate]);

    // const loadInitialData = async () => {
    //     try {
    //         // Load stores
    //         const { data: storesData } = await supabase
    //             .from("stores")
    //             .select("id, name")
    //             .order("name");
    //         setStores(storesData || []);

    //         // Load sellers
    //         const { data: sellersData } = await supabase
    //             .from("profiles")
    //             .select("id, full_name")
    //             .eq("role", "seller")
    //             .order("full_name");
    //         setSellers(sellersData || []);

    //         setLoading(false);
    //     } catch (error) {
    //         console.error("Error loading initial data:", error);
    //         setLoading(false);
    //     }
    // };

    // const loadSummaries = async () => {
    //     // console.log("[DEBUG] - loadSummaries called");

    //     // Check selectedStore
    //     if (!selectedStore) {
    //         console.warn(
    //             "[DEBUG] - selectedStore is not defined or is falsy:",
    //             selectedStore
    //         );
    //         return;
    //     }

    //     // Extract and log date range
    //     const { start, end } = getDateRange();
    //     // console.log("[DEBUG] - Date range:", { start, end });

    //     try {
    //         // console.log("[DEBUG] - Starting Supabase query...");

    //         const { data, error } = await supabase
    //             .from("daily_summaries")
    //             .select(
    //                 `
    //     *,
    //     stores(name),
    //     manager:profiles!daily_summaries_manager_id_fkey(full_name),
    //     seller:profiles!daily_summaries_seller_id_fkey(full_name)
    // `
    //             )
    //             .eq("store_id", selectedStore)
    //             .gte("date", start)
    //             .lte("date", end)
    //             .order("date", { ascending: false });

    //         // console.log("[DEBUG] - Raw Supabase Response:", { data, error });

    //         if (error) {
    //             console.error("[ERROR] - Supabase returned an error:", error);
    //             return;
    //         }

    //         if (!data || data.length === 0) {
    //             console.warn(
    //                 "[DEBUG] - No summaries found for the given criteria."
    //             );
    //         }

    //         setSummaries(data || []);
    //         // console.log("[DEBUG] - Summaries successfully set:", data);
    //     } catch (err) {
    //         console.error(
    //             "[ERROR] - Caught exception while fetching summaries:",
    //             err
    //         );
    //     }
    // };

    // const getDateRange = () => {
    //     const selected = new Date(selectedDate);
    //     const start = new Date(selected);
    //     start.setDate(selected.getDate() - 7); // Show last 7 days

    //     return {
    //         start: start.toISOString().split("T")[0],
    //         end: selectedDate,
    //     };
    // };

    const calculateTotalSales = async (storeId: string, date: string) => {
        const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("store_id", storeId)
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${date}T23:59:59`);

        return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    };

    const handleOpeningSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // Check if summary already exists for this store/date
            const { data: existing } = await supabase
                .from("daily_summaries")
                .select("id")
                .eq("store_id", openingForm.store_id)
                .eq("date", openingForm.date)
                .single();

            if (existing) {
                alert("Daily summary already exists for this store and date");
                return;
            }

            const totalSales = await calculateTotalSales(
                openingForm.store_id,
                openingForm.date
            );
            const openingBalance = parseFloat(openingForm.opening_balance);
            const expectedCash = openingBalance + totalSales;

            const { error } = await supabase.from("daily_summaries").insert({
                store_id: openingForm.store_id,
                seller_id: openingForm.seller_id,
                manager_id: user.id,
                date: openingForm.date,
                opening_balance: openingBalance,
                total_sales: totalSales,
                expected_cash: expectedCash,
            });

            if (error) throw error;

            setOpeningForm({
                store_id: "",
                seller_id: "",
                opening_balance: "",
                date: "",
            });
            setShowOpeningForm(false);
            mutate();
        } catch (error) {
            console.error("Error creating daily summary:", error);
            alert("Failed to create daily summary");
        }
    };

    const handleCloseDay = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedSummary) return;

        try {
            const actualCash = parseFloat(closeForm.actual_cash);
            const variance = actualCash - selectedSummary.expected_cash;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    actual_cash: actualCash,
                    variance: variance,
                    notes: closeForm.notes || null,
                    closed_at: new Date().toISOString(),
                })
                .eq("id", selectedSummary.id);

            if (error) throw error;

            setCloseForm({ actual_cash: "", notes: "" });
            setShowCloseForm(false);
            setSelectedSummary(null);
            mutate();
        } catch (error) {
            console.error("Error closing day:", error);
            alert("Failed to close day");
        }
    };

    const refreshSales = async (summary: DailySummary) => {
        try {
            const totalSales = await calculateTotalSales(
                summary.store_id,
                summary.date
            );
            const expectedCash = summary.opening_balance + totalSales;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    total_sales: totalSales,
                    expected_cash: expectedCash,
                })
                .eq("id", summary.id);

            if (error) throw error;

            mutate();
        } catch (error) {
            console.error("Error refreshing sales:", error);
            alert("Failed to refresh sales");
        }
    };

    // if (loading) return <div>Loading analytics...</div>;

    if (isLoading) return <div>Loading analytics...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Daily Analytics</h1>

            {/* Controls */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Store
                        </label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Select a store...</option>
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Date Range (Last 7 days from)
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => setShowOpeningForm(true)}
                            disabled={!selectedStore}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                        >
                            Set Opening Balance
                        </button>
                    </div>
                </div>
            </div>

            {/* Opening Balance Form Modal */}
            {showOpeningForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">
                            Set Opening Balance
                        </h2>
                        <form
                            onSubmit={handleOpeningSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Store
                                </label>
                                <select
                                    value={openingForm.store_id}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            store_id: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">Select store...</option>
                                    {stores.map((store) => (
                                        <option key={store.id} value={store.id}>
                                            {store.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Seller
                                </label>
                                <select
                                    value={openingForm.seller_id}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            seller_id: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">Select seller...</option>
                                    {sellers.map((seller) => (
                                        <option
                                            key={seller.id}
                                            value={seller.id}
                                        >
                                            {seller.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={openingForm.date}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            date: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Opening Balance
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={openingForm.opening_balance}
                                    onChange={(e) =>
                                        setOpeningForm({
                                            ...openingForm,
                                            opening_balance: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="submit"
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                >
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowOpeningForm(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Day Form Modal */}
            {showCloseForm && selectedSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">
                            Close Day
                        </h2>
                        <div className="mb-4 p-4 bg-gray-50 rounded">
                            <p>
                                <strong>Expected Cash:</strong> Rp{" "}
                                {selectedSummary.expected_cash}
                            </p>
                            <p className="text-sm text-gray-600">
                                Opening: Rp {selectedSummary.opening_balance} +
                                Sales: Rp {selectedSummary.total_sales}
                            </p>
                        </div>
                        <form onSubmit={handleCloseDay} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Actual Cash Count
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={closeForm.actual_cash}
                                    onChange={(e) =>
                                        setCloseForm({
                                            ...closeForm,
                                            actual_cash: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={closeForm.notes}
                                    onChange={(e) =>
                                        setCloseForm({
                                            ...closeForm,
                                            notes: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded h-20"
                                    placeholder="Any notes about the day..."
                                />
                            </div>
                            {closeForm.actual_cash && (
                                <div className="p-3 bg-yellow-50 rounded">
                                    <p className="font-medium">
                                        Variance: Rp{" "}
                                        {parseFloat(closeForm.actual_cash) -
                                            selectedSummary.expected_cash}
                                    </p>
                                </div>
                            )}
                            <div className="flex space-x-4">
                                <button
                                    type="submit"
                                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                >
                                    Close Day
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCloseForm(false);
                                        setSelectedSummary(null);
                                        setCloseForm({
                                            actual_cash: "",
                                            notes: "",
                                        });
                                    }}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Summaries */}
            {selectedStore && (
                <div className="space-y-4">
                    {summaries.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">
                                No daily summaries found for the selected period
                            </p>
                        </div>
                    ) : (
                        summaries.map((summary) => (
                            <div
                                key={summary.id}
                                className="bg-white p-6 rounded-lg shadow"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {new Date(
                                                summary.date
                                            ).toLocaleDateString()}
                                        </h3>
                                        <p className="text-gray-600">
                                            Seller: {summary.seller?.full_name}
                                        </p>
                                        <p className="text-gray-600">
                                            Store: {summary.stores?.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {summary.closed_at ? (
                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                                                Closed
                                            </span>
                                        ) : (
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                                Open
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Opening Balance
                                        </p>
                                        <p className="text-xl font-bold">
                                            Rp {summary.opening_balance}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Total Sales
                                        </p>
                                        <p className="text-xl font-bold text-green-600">
                                            Rp {summary.total_sales}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Expected Cash
                                        </p>
                                        <p className="text-xl font-bold text-blue-600">
                                            Rp {summary.expected_cash}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Actual Cash
                                        </p>
                                        {summary.actual_cash !== null ? (
                                            <p className="text-xl font-bold">
                                                Rp {summary.actual_cash}
                                            </p>
                                        ) : (
                                            <p className="text-xl text-gray-400">
                                                Not counted
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* {summary.variance !== null && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600">
                                            Variance
                                        </p>
                                        <p
                                            className={`text-lg font-bold ${
                                                summary.variance >= 0
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            ${summary.variance >= 0 ? "+" : ""}$
                                            {summary.variance.toFixed(2)}
                                        </p>
                                    </div>
                                )} */}

                                {summary.variance !== null && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600">
                                            Variance
                                        </p>
                                        <p
                                            className={`text-lg font-bold ${
                                                summary.variance >= 0
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            Rp{" "}
                                            {`${
                                                summary.variance >= 0 ? "+" : ""
                                            }${summary.variance}`}
                                        </p>
                                    </div>
                                )}

                                {summary.notes && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600">
                                            Notes
                                        </p>
                                        <p className="text-gray-800">
                                            {summary.notes}
                                        </p>
                                    </div>
                                )}

                                <div className="flex space-x-2">
                                    {!summary.closed_at && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    refreshSales(summary)
                                                }
                                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                            >
                                                Refresh Sales
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedSummary(summary);
                                                    setCloseForm({
                                                        actual_cash:
                                                            summary.expected_cash.toString(),
                                                        notes: "",
                                                    });
                                                    setShowCloseForm(true);
                                                }}
                                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                            >
                                                Close Day
                                            </button>
                                        </>
                                    )}
                                </div>

                                {summary.closed_at && (
                                    <div className="text-xs text-gray-500 mt-2">
                                        Closed:{" "}
                                        {new Date(
                                            summary.closed_at
                                        ).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
