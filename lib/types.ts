export interface Database {
    public: {
        Tables: {
            stores: {
                Row: {
                    id: string;
                    name: string;
                    address: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    address?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    address?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string;
                    role: "seller" | "manager";
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name: string;
                    role: "seller" | "manager";
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string;
                    role?: "seller" | "manager";
                    created_at?: string;
                    updated_at?: string;
                };
            };
            user_store_assignments: {
                Row: {
                    id: string;
                    user_id: string;
                    store_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    store_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    store_id?: string;
                    created_at?: string;
                };
            };
            products: {
                Row: {
                    id: string;
                    name: string;
                    price: number;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    price: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    price?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    store_id: string;
                    user_id: string;
                    total_amount: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    store_id: string;
                    user_id: string;
                    total_amount: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    store_id?: string;
                    user_id?: string;
                    total_amount?: number;
                    created_at?: string;
                };
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string;
                    quantity: number;
                    unit_price: number;
                    total_price: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    product_id: string;
                    quantity: number;
                    unit_price: number;
                    total_price: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    product_id?: string;
                    quantity?: number;
                    unit_price?: number;
                    total_price?: number;
                    created_at?: string;
                };
            };
            daily_summaries: {
                Row: {
                    id: string;
                    store_id: string;
                    user_id: string;
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
                };
                Insert: {
                    id?: string;
                    store_id: string;
                    user_id: string;
                    manager_id?: string | null;
                    date: string;
                    opening_balance?: number;
                    total_sales?: number;
                    expected_cash?: number;
                    actual_cash?: number | null;
                    variance?: number | null;
                    closed_at?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    store_id?: string;
                    user_id?: string;
                    manager_id?: string | null;
                    date?: string;
                    opening_balance?: number;
                    total_sales?: number;
                    expected_cash?: number;
                    actual_cash?: number | null;
                    variance?: number | null;
                    closed_at?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
            };
        };
    };
}

export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DailySummary =
    Database["public"]["Tables"]["daily_summaries"]["Row"];

export interface CartItem {
    product: Product;
    quantity: number;
}
