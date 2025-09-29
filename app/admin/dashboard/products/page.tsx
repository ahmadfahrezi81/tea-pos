//dashboard/products/page.tsx

"use client";
import React, { useEffect, useState } from "react";
import { Product } from "./types/product";
import { useProductForm } from "./hooks/useProductForm";
import { useProductFilters } from "./hooks/useProductFilters";
import { ProductFormModal } from "./components/ProductFormModal";
import { ProductsSearchFilter } from "./components/ProductsSearchFilter";
import { ProductList } from "./components/ProductList";
import { ProductDeleteModal } from "./components/ProductDeleteModal";
import { PackagePlus } from "lucide-react";
import { useProductActions } from "./hooks/useProductActions";

export default function ProductsPageComponents() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        product: Product | null;
    }>({ isOpen: false, product: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Custom hooks
    const productForm = useProductForm();
    const productFilters = useProductFilters(products);

    // Add this inside your component (after the other hooks)
    const productActions = useProductActions();

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const response = await fetch("/api/products?all=true");
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setLoading(false);
        }
    };

    // In your main component, replace the handleSubmit function with this:
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { name, price, imageUrl, isMain } = productForm.productForm; // Changed isActive to isMain

            if (productForm.editingProduct) {
                // Update existing product
                await productActions.updateProduct(
                    productForm.editingProduct.id,
                    name,
                    parseFloat(price),
                    imageUrl || undefined, // Convert empty string to undefined
                    isMain // Changed from isActive to isMain
                );
            } else {
                // Create new product
                await productActions.createProduct(
                    name,
                    parseFloat(price),
                    imageUrl || undefined, // Convert empty string to undefined
                    isMain // Changed from isActive to isMain
                );
            }

            await loadProducts();
            productForm.closeForm();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Failed to save product");
        } finally {
            setIsSubmitting(false);
        }
    };

    // const handleSubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     setIsSubmitting(true);

    //     try {
    //         const method = productForm.editingProduct ? "PUT" : "POST";
    //         const body = productForm.editingProduct
    //             ? {
    //                   id: productForm.editingProduct.id,
    //                   name: productForm.productForm.name,
    //                   price: parseFloat(productForm.productForm.price),
    //               }
    //             : {
    //                   name: productForm.productForm.name,
    //                   price: parseFloat(productForm.productForm.price),
    //               };

    //         const response = await fetch("/api/products", {
    //             method,
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify(body),
    //         });

    //         if (response.ok) {
    //             await loadProducts();
    //             productForm.closeForm();
    //         } else {
    //             throw new Error("Failed to save product");
    //         }
    //     } catch (error) {
    //         console.error("Error saving product:", error);
    //         alert("Failed to save product");
    //     } finally {
    //         setIsSubmitting(false);
    //     }
    // };

    const handleToggleActive = async (product: Product) => {
        try {
            await fetch("/api/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: product.id,
                    is_active: !product.is_active,
                }),
            });
            loadProducts();
        } catch (error) {
            console.error("Error toggling product status:", error);
            alert("Failed to update product status");
        }
    };

    // Delete handlers
    const handleDeleteProduct = (product: Product) => {
        setDeleteModal({ isOpen: true, product });
    };

    const handleConfirmDelete = async (productId: string) => {
        setIsDeleting(true);

        try {
            const response = await fetch("/api/products", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: productId }),
            });

            if (!response.ok) {
                throw new Error("Failed to delete product");
            }

            await loadProducts();
            setDeleteModal({ isOpen: false, product: null });
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 text-sm">
                        Loading products...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 z-30 py-6 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Products Management
                        </h1>
                        <p className="text-gray-600">
                            Manage your product catalog and inventory
                        </p>
                    </div>
                    <button
                        onClick={productForm.openCreateForm}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex gap-2 items-center justify-center text-sm font-medium"
                    >
                        Add Product
                        <PackagePlus size={18} />
                    </button>
                </div>

                <div className="pt-4">
                    <ProductsSearchFilter
                        searchQuery={productFilters.searchQuery}
                        onSearchChange={productFilters.setSearchQuery}
                        selectedStatus={productFilters.selectedStatus}
                        onStatusFilterChange={productFilters.setSelectedStatus}
                        totalProducts={products.length}
                        filteredProductsCount={
                            productFilters.filteredProducts.length
                        }
                    />
                </div>
            </div>

            {/* Main Content */}
            <div
                className="flex flex-col h-[calc(80vh-16px)] overflow-y-auto after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-30 after:bg-gradient-to-t after:from-white after:to-transparent after:pointer-events-none after:z-10"
                style={{
                    overflowY: "auto",
                    scrollbarWidth: "none", // Firefox
                    msOverflowStyle: "none", // IE 10+, Edge
                }}
            >
                <ProductList
                    products={productFilters.filteredProducts}
                    onEditProduct={productForm.openEditForm}
                    onToggleActive={handleToggleActive}
                    onDeleteProduct={handleDeleteProduct}
                />
            </div>

            {/* No Results State */}
            {productFilters.filteredProducts.length === 0 &&
                products.length > 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">
                            No products match your current filters
                        </p>
                        <button
                            onClick={productFilters.clearFilters}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

            {/* Empty State */}
            {products.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No products found</p>
                    <button
                        onClick={productForm.openCreateForm}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                        Add Your First Product
                    </button>
                </div>
            )}

            {/* Modals */}
            <ProductFormModal
                isOpen={productForm.showProductForm}
                productForm={productForm.productForm}
                editingProduct={productForm.editingProduct}
                onSubmit={handleSubmit}
                onClose={productForm.closeForm}
                onFormChange={productForm.setProductForm}
                isSubmitting={isSubmitting}
            />

            <ProductDeleteModal
                isOpen={deleteModal.isOpen}
                product={deleteModal.product}
                onClose={() => setDeleteModal({ isOpen: false, product: null })}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
