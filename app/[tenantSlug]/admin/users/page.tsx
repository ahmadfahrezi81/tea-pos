//app/[tenantSlug]/admin/users/page.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, UserPlus } from "lucide-react";
import { useTenant } from "../TenantProvider";
import useTenantUsers from "@/lib/hooks/tenants/useTenantUsers";
import { DataTable } from "./_components/data-table";
import { createColumns, User } from "./_components/columns";
import { AddUserModal } from "./_components/add-user-modal";
import { EditUserModal } from "./_components/edit-user-modal";
import { InviteUserModal } from "./_components/invite-user-modal";
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

export default function UsersPage() {
    const { tenantId } = useTenant();
    const { data: users, error, isLoading, mutate } = useTenantUsers(tenantId);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddUser = () => {
        setAddModalOpen(true);
    };

    const handleInviteUser = () => {
        setInviteModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditModalOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/users/${userToDelete.userId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to delete user");
            }

            toast.success("User removed successfully");
            mutate();
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to remove user"
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSuccess = () => {
        mutate();
    };

    const columns = createColumns(handleEditUser, handleDeleteUser);

    if (!tenantId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Tenant Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        Please select a tenant to view users.
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
                        Loading users...
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
                    <h1 className="text-3xl font-bold">User List</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your users and their roles here.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="default"
                        onClick={handleInviteUser}
                        disabled
                    >
                        <Mail className="mr-2 h-4 w-4" />
                        Invite User
                    </Button>
                    <Button size="default" onClick={handleAddUser}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={users || []} />

            {/* Add User Modal */}
            <AddUserModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                onSuccess={handleSuccess}
            />

            {/* Invite User Modal */}
            <InviteUserModal
                open={inviteModalOpen}
                onOpenChange={setInviteModalOpen}
                tenantId={tenantId}
                onSuccess={handleSuccess}
            />

            {/* Edit User Modal */}
            {selectedUser && (
                <EditUserModal
                    open={editModalOpen}
                    onOpenChange={setEditModalOpen}
                    onSuccess={handleSuccess}
                    userId={selectedUser.userId}
                    initialData={{
                        fullName: selectedUser.profiles?.fullName || "",
                        email: selectedUser.profiles?.email || "",
                        role: selectedUser.role as
                            | "owner"
                            | "manager"
                            | "staff",
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove{" "}
                            <span className="font-semibold">
                                {userToDelete?.profiles?.fullName}
                            </span>{" "}
                            from your tenant. This action cannot be undone.
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
                            {isDeleting ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
