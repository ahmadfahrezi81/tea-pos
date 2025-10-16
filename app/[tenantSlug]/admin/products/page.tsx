"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AddProductModal } from "./_components/add-product-modal";
import { useProducts } from "@/lib/hooks/products/useProducts";
import { useTenant } from "../../TenantProvider";
import { DataTable } from "./_components/data-table";
import { createColumns } from "./_components/columns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditProductModal } from "./_components/edit-product-modal";
import { Product } from "@/lib/schemas/products";
import { ScopeBadge } from "../_components/scope-badge";

export default function ProductsPage() {
    const { tenantId } = useTenant();
    const { data: products, error, isLoading, mutate } = useProducts(true);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(
        null
    );
    const [isDeleting, setIsDeleting] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null
    );

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setEditModalOpen(true);
    };

    const handleDeleteProduct = (product: Product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            const response = await fetch("/api/products", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: productToDelete.id }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to delete product");
            }

            toast.success("Product deleted successfully");
            mutate();
            setDeleteDialogOpen(false);
            setProductToDelete(null);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete product"
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = createColumns(handleEditProduct, handleDeleteProduct);
    if (!tenantId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Tenant Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        Please select a tenant to view products.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-4">
                        Loading products...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500">Error</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-8 pt-6">
            {/* Scope Tagging */}
            <ScopeBadge />
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Product List</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your products and their availability here.
                    </p>
                </div>
                <Button size="default" onClick={() => setAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                </Button>
            </div>

            <DataTable columns={columns} data={products || []} />

            <AddProductModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                onSuccess={() => mutate()}
            />

            <EditProductModal
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                product={selectedProduct}
                onSuccess={() => mutate()}
            />

            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete{" "}
                            <span className="font-semibold">
                                {productToDelete?.name}
                            </span>{" "}
                            from your products. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
