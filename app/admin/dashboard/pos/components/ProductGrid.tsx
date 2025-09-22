// components/ProductGrid.tsx
import React from "react";
import { Product } from "../types/pos";

interface ProductGridProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
    products,
    onAddToCart,
}) => {
    return (
        <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products?.map((product: Product) => (
                    <div
                        key={product.id}
                        className="bg-white p-4 rounded-lg shadow"
                    >
                        <h3 className="font-medium mb-2">{product.name}</h3>
                        <p className="text-xl font-bold text-green-600 mb-3">
                            Rp {product.price}
                        </p>
                        <button
                            onClick={() => onAddToCart(product)}
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                        >
                            Add to Cart
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
