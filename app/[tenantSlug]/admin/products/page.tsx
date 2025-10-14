// "use client";

// import React from "react";
// import { usePathname } from "next/navigation";

// const Page = () => {
//     const pathname = usePathname();

//     return (
//         <main className="flex items-center justify-center h-screen flex-col font-sans">
//             <p className="text-lg">
//                 Current Route: <strong>{pathname}</strong>
//             </p>
//         </main>
//     );
// };

// export default Page;

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTenant } from "../TenantProvider";
// import { useProducts } from "";
import { DataTable } from "./_components/data-table";
import { createColumns, Product } from "./_components/columns";
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
import { toast } from "sonner";
import { useProducts } from "@/lib/hooks/products/useProducts";

export default function ProductsPage() {
    const { tenantId } = useTenant();
    const { data: products, error, isLoading, mutate } = useProducts(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(
        null
    );
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddProduct = () => {
        // Will be implemented later
        toast.info("Add product modal will be implemented soon");
    };

    const handleEditProduct = (product: Product) => {
        // Will be implemented later
        toast.info("Edit product modal will be implemented soon");
    };

    const handleDeleteProduct = (product: Product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/products`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
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

    const handleSuccess = () => {
        mutate();
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
        <div className="space-y-6 p-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Product List</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your products and their availability here.
                    </p>
                </div>
                <Button size="default" onClick={handleAddProduct} disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                </Button>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={products || []} />

            {/* Delete Confirmation Dialog */}
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
