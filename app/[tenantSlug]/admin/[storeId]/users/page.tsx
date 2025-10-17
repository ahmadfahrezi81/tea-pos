// app/[tenantSlug]/admin/[storeId]/users/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useTenant } from "../../../TenantProvider";
import { useStoreScope } from "../../StoreScopeProvider";
import useStoreUsers from "@/lib/hooks/stores/useStoreUsers";
import { DataTable } from "./_components/data-table";
import { createColumns } from "./_components/columns";
import { StoreUser } from "@/lib/schemas/userStoreAssignments";
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
import { ScopeBadge } from "../../_components/scope-badge";
import { AddAssignmentModal } from "./_components/add-assignment-modal";

export default function StoreUsersPage() {
    const { tenantId } = useTenant();
    const { storeId, storeName } = useStoreScope();
    const {
        data: users,
        error,
        isLoading,
        mutate,
    } = useStoreUsers(storeId ?? null, tenantId ?? null);

    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState<StoreUser | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);

    const handleAddAssignment = () => {
        setAddModalOpen(true);
    };

    const handleRemoveAssignment = (user: StoreUser) => {
        setUserToRemove(user);
        setRemoveDialogOpen(true);
    };

    const confirmRemove = async () => {
        if (!userToRemove) return;

        setIsRemoving(true);
        try {
            // TODO: Implement DELETE /api/stores/assignments endpoint call
            const params = new URLSearchParams({
                userId: userToRemove.userId,
                storeId: userToRemove.storeId,
                role: userToRemove.role,
            });

            const response = await fetch(
                `/api/stores/assignments?${params.toString()}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to remove assignment");
            }

            toast.success("Assignment removed successfully");
            mutate();
            setRemoveDialogOpen(false);
            setUserToRemove(null);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to remove assignment"
            );
        } finally {
            setIsRemoving(false);
        }
    };

    const columns = createColumns(handleRemoveAssignment);

    if (!storeId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Store Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        Please select a store to view user assignments.
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
                        Loading store users...
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
            {/* Scope Badge */}
            <ScopeBadge />

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        User Store Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage user assignments and roles for{" "}
                        <span className="font-semibold">{storeName}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="default" onClick={handleAddAssignment}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Assignment
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={users || []} />

            {/* Remove Assignment Confirmation Dialog */}
            <AlertDialog
                open={removeDialogOpen}
                onOpenChange={setRemoveDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove{" "}
                            <span className="font-semibold">
                                {userToRemove?.profiles?.fullName}
                            </span>{" "}
                            as a{" "}
                            <span className="font-semibold capitalize">
                                {userToRemove?.role}
                            </span>{" "}
                            from this store. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemove}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isRemoving ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AddAssignmentModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                onSuccess={() => {
                    mutate(); // Refresh the user list after adding
                    toast.success("Assignments updated successfully");
                }}
            />
        </div>
    );
}
