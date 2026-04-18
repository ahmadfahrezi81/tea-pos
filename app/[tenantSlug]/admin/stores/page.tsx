//app/[tenantSlug]/admin/stores/page.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { useTenant } from "../../TenantProvider";
import { useStores } from "@/lib/client/hooks/stores/useStores";
import { DataTable } from "./_components/data-table";
import { createColumns } from "./_components/columns";
import { ScopeBadge } from "../_components/scope-badge";
import { AddStoreModal } from "./_components/add-store-modal";
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
import useDeleteStore from "@/lib/client/hooks/stores/useDeleteStore";

export default function StoresPage() {
    const { tenantId } = useTenant();
    const { data, error, isLoading, mutate } = useStores();
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [storeToDelete, setStoreToDelete] = useState<any>(null);

    const { deleteStore, isDeleting } = useDeleteStore();

    const handleDelete = async () => {
        if (!storeToDelete) return;
        const success = await deleteStore(storeToDelete.id);
        if (success) {
            setDeleteDialogOpen(false);
            mutate(); // refresh the list
        }
    };

    const columns = createColumns({
        onDelete: (store) => {
            setStoreToDelete(store);
            setDeleteDialogOpen(true);
        },
    });

    if (!tenantId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Tenant Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        Please select a tenant to view stores.
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
                        Loading stores...
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
            <ScopeBadge />

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Store Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your stores and locations across your
                        organization.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setAddModalOpen(true)}>
                        <Store className="mr-2 h-4 w-4" />
                        Add Store
                    </Button>
                </div>
            </div>

            <DataTable columns={columns} data={data?.stores || []} />

            <AddStoreModal
                open={isAddModalOpen}
                onOpenChange={setAddModalOpen}
                onSuccess={() => mutate()}
            />

            {/* Delete Confirmation */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Store</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">
                                {storeToDelete?.name}
                            </span>
                            ? <br />
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
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
