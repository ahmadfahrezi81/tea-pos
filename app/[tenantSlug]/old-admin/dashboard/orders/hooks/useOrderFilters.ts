// // hooks/useOrderFilters.ts
// import { useState, useMemo } from "react";
// import { Order, OrdersSummary } from "../types/orders";

// const formatDateForInput = (date: Date) => {
//     return date.toISOString().split("T")[0];
// };

// export const useOrderFilters = (orders: Order[]) => {
//     const [selectedDate, setSelectedDate] = useState(
//         formatDateForInput(new Date())
//     );
//     const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
//     const [orderIdSearch, setOrderIdSearch] = useState("");

//     // Filter orders based on selected criteria
//     const filteredOrders = useMemo(() => {
//         let filtered = [...orders];

//         // Filter by selected date
//         if (selectedDate) {
//             const targetDate = new Date(selectedDate);
//             filtered = filtered.filter((order) => {
//                 const orderDate = new Date(order.created_at + "Z");
//                 return orderDate.toDateString() === targetDate.toDateString();
//             });
//         }

//         // Filter by selected stores (if any selected)
//         if (selectedStoreIds.length > 0) {
//             filtered = filtered.filter((order) =>
//                 selectedStoreIds.includes(order.store_id)
//             );
//         }

//         // Filter by order ID search
//         if (orderIdSearch.trim()) {
//             filtered = filtered.filter((order) =>
//                 order.id
//                     .toLowerCase()
//                     .includes(orderIdSearch.toLowerCase().trim())
//             );
//         }

//         // Sort by date (newest first)
//         filtered.sort((a, b) => {
//             const dateA = new Date(a.created_at + "Z").getTime();
//             const dateB = new Date(b.created_at + "Z").getTime();
//             return dateB - dateA;
//         });

//         return filtered;
//     }, [orders, selectedDate, selectedStoreIds, orderIdSearch]);

//     // Add order numbers for display
//     const ordersWithNumbers = useMemo(() => {
//         return filteredOrders.map((order, index) => ({
//             ...order,
//             orderNumber: filteredOrders.length - index,
//         }));
//     }, [filteredOrders]);

//     // Calculate summary statistics
//     const summaryStats = useMemo((): OrdersSummary => {
//         const totalOrders = filteredOrders.length;
//         const totalSales = filteredOrders.reduce(
//             (sum, order) => sum + order.total_amount,
//             0
//         );
//         const totalCups = filteredOrders.reduce((sum, order) => {
//             return (
//                 sum +
//                 order.order_items.reduce(
//                     (itemSum, item) => itemSum + item.quantity,
//                     0
//                 )
//             );
//         }, 0);

//         return { totalOrders, totalSales, totalCups };
//     }, [filteredOrders]);

//     const clearFilters = () => {
//         setSelectedDate(formatDateForInput(new Date()));
//         setSelectedStoreIds([]);
//         setOrderIdSearch("");
//     };

//     const hasActiveFilters =
//         selectedDate !== formatDateForInput(new Date()) ||
//         selectedStoreIds.length > 0 ||
//         orderIdSearch.trim() !== "";

//     return {
//         selectedDate,
//         setSelectedDate,
//         selectedStoreIds,
//         setSelectedStoreIds,
//         orderIdSearch,
//         setOrderIdSearch,
//         filteredOrders: ordersWithNumbers,
//         summaryStats,
//         clearFilters,
//         hasActiveFilters,
//     };
// };

// hooks/useOrderFilters.ts
import { useState, useMemo } from "react";
import { Order, OrdersSummary } from "../types/orders";

const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
};

export const useOrderFilters = (orders: Order[]) => {
    const [selectedDate, setSelectedDate] = useState(
        formatDateForInput(new Date())
    );

    // Auto-select the two real stores by their IDs
    const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([
        "f559445e-e4be-4491-9294-8f979367b61c", // Replace with your first real store ID
        "ff319614-6f47-4991-b5c7-d5086c7f015d", // Replace with your second real store ID
    ]);

    const [orderIdSearch, setOrderIdSearch] = useState("");

    // Filter orders based on selected criteria
    const filteredOrders = useMemo(() => {
        let filtered = [...orders];

        // Filter by selected date
        if (selectedDate) {
            const targetDate = new Date(selectedDate);
            filtered = filtered.filter((order) => {
                const orderDate = new Date(order.created_at + "Z");
                return orderDate.toDateString() === targetDate.toDateString();
            });
        }

        // Filter by selected stores (if any selected)
        if (selectedStoreIds.length > 0) {
            filtered = filtered.filter((order) =>
                selectedStoreIds.includes(order.store_id)
            );
        }

        // Filter by order ID search
        if (orderIdSearch.trim()) {
            filtered = filtered.filter((order) =>
                order.id
                    .toLowerCase()
                    .includes(orderIdSearch.toLowerCase().trim())
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at + "Z").getTime();
            const dateB = new Date(b.created_at + "Z").getTime();
            return dateB - dateA;
        });

        return filtered;
    }, [orders, selectedDate, selectedStoreIds, orderIdSearch]);

    // Add order numbers for display
    const ordersWithNumbers = useMemo(() => {
        return filteredOrders.map((order, index) => ({
            ...order,
            orderNumber: filteredOrders.length - index,
        }));
    }, [filteredOrders]);

    // Calculate summary statistics
    const summaryStats = useMemo((): OrdersSummary => {
        const totalOrders = filteredOrders.length;
        const totalSales = filteredOrders.reduce(
            (sum, order) => sum + order.total_amount,
            0
        );
        const totalCups = filteredOrders.reduce((sum, order) => {
            return (
                sum +
                order.order_items.reduce(
                    (itemSum, item) => itemSum + item.quantity,
                    0
                )
            );
        }, 0);

        return { totalOrders, totalSales, totalCups };
    }, [filteredOrders]);

    const clearFilters = () => {
        setSelectedDate(formatDateForInput(new Date()));
        setSelectedStoreIds([]);
        setOrderIdSearch("");
    };

    const hasActiveFilters =
        selectedDate !== formatDateForInput(new Date()) ||
        selectedStoreIds.length > 0 ||
        orderIdSearch.trim() !== "";

    return {
        selectedDate,
        setSelectedDate,
        selectedStoreIds,
        setSelectedStoreIds,
        orderIdSearch,
        setOrderIdSearch,
        filteredOrders: ordersWithNumbers,
        summaryStats,
        clearFilters,
        hasActiveFilters,
    };
};
