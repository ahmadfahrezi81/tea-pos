// types/pos.ts
export interface Product {
    id: string;
    name: string;
    price: number;
    is_active?: boolean;
    image_url?: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface Store {
    id: string;
    name: string;
}

export interface OrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface OrderRequest {
    storeId: string;
    items: OrderItem[];
}
