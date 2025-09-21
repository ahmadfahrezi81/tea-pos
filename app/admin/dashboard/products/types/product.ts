// types/product.ts
export interface Product {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    image_url?: string;
    created_at: string;
    updated_at: string;
    is_main: boolean;
}
