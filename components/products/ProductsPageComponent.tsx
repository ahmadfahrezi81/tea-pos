"use client";
import { Product } from "@/lib/types";
import { useEffect, useState } from "react";

export default function ProductsPageComponents() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState<Product>();
    const [formData, setFormData] = useState({ name: "", price: "" });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        const response = await fetch("/api/products?all=true");
        const data = await response.json();
        setProducts(data.products || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const method = editProduct ? "PUT" : "POST";
        const body = editProduct
            ? { id: editProduct.id, ...formData }
            : formData;

        const response = await fetch("/api/products", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            await loadProducts();
            setFormData({ name: "", price: "" });
            setShowForm(false);
            setEditProduct(undefined);
        }
    };

    const handleEdit = (product: Product) => {
        setEditProduct(product);
        setFormData({ name: product.name, price: product.price.toString() });
        setShowForm(true);
    };

    const toggleActive = async (product: Product) => {
        await fetch("/api/products", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: product.id,
                is_active: !product.is_active,
            }),
        });
        loadProducts();
    };

    if (loading) return <div>Loading products...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Products</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Add Product
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        {editProduct ? "Edit Product" : "Add New Product"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Price
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        price: e.target.value,
                                    })
                                }
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                {editProduct ? "Update" : "Create"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditProduct(undefined);
                                    setFormData({ name: "", price: "" });
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="bg-white p-6 rounded-lg shadow"
                    >
                        <h3 className="text-lg font-semibold mb-2">
                            {product.name}
                        </h3>
                        <p className="text-2xl font-bold text-green-600 mb-4">
                            ${product.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                            Status: {product.is_active ? "Active" : "Inactive"}
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleEdit(product)}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => toggleActive(product)}
                                className={`px-3 py-1 rounded text-sm ${
                                    product.is_active
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-green-500 hover:bg-green-600 text-white"
                                }`}
                            >
                                {product.is_active ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
