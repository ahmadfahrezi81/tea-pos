// types/orders.ts
export interface OrderItem {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
        name: string;
    };
}

export interface Order {
    id: string;
    store_id: string;
    total_amount: number;
    created_at: string;
    order_items: OrderItem[];
    stores?: {
        name: string;
    };
    profiles?: {
        full_name: string;
    };
}

export interface Store {
    id: string;
    name: string;
}

export interface OrdersSummary {
    totalOrders: number;
    totalSales: number;
    totalCups: number;
}
