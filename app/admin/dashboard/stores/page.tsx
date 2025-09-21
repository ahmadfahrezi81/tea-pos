// import StoresPageComponents from "@/app/admin/dashboard/stores/components/StoresPageComponent";

// export default async function StoresPage() {
//     return (
//         <div>
//             <StoresPageComponents />
//         </div>
//     );
// }

"use client";
import React, { useState } from "react";
import useStoresData, {
    useStoreActions,
    useAssignmentActions,
} from "@/lib/hooks/useStores";
import { StoreList } from "./components/StoreList";
import { DeleteConfirmationModal } from "./components/DeleteConfimationModal";
import { StoreFormModal } from "./components/StoreFormModal";
import { StoreAssignmentModal } from "./components/StoreAssignmentModal";
import { AssignedUser, Store, User } from "./types/store";
import { useStoreForm } from "./hooks/useStoreForm";
import { useStoreAssignment } from "./hooks/useStoreAssignment";
import { StoresSearchFilter } from "./components/StoresSearchFilter";
import { useStoreFilters } from "./hooks/useStoreFilters";
import { HousePlus } from "lucide-react";

export default function StoresPageComponents() {
    // Delete modal state
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        store: Store | null;
    }>({ isOpen: false, store: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Custom hooks for form and assignment management
    const storeForm = useStoreForm();
    const storeAssignment = useStoreAssignment();

    // Data and actions
    const { data, isLoading, mutate } = useStoresData();
    const { createStore, updateStore, deleteStore } = useStoreActions();
    const { createAssignment, deleteAssignment, updateAssignment } =
        useAssignmentActions();

    const { stores = [], users = [], assignments = {} } = data || {};

    // Add this line after the above:
    const storeFilters = useStoreFilters(stores, assignments);

    // Store form handlers
    const handleStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (storeForm.editingStore) {
                await updateStore(
                    storeForm.editingStore.id,
                    storeForm.storeForm.name,
                    storeForm.storeForm.address
                );
            } else {
                await createStore(
                    storeForm.storeForm.name,
                    storeForm.storeForm.address
                );
            }

            storeForm.closeForm();
            mutate();
        } catch (error) {
            console.error("Error saving store:", error);
            alert("Failed to save store");
        }
    };

    // Delete handlers
    const handleDeleteStore = (store: Store) => {
        setDeleteModal({ isOpen: true, store });
    };

    const handleConfirmDelete = async (storeId: string) => {
        setIsDeleting(true);

        try {
            await deleteStore(storeId);
            mutate();
            setDeleteModal({ isOpen: false, store: null });
        } catch (error) {
            console.error("Error deleting store:", error);
            alert("Failed to delete store");
        } finally {
            setIsDeleting(false);
        }
    };

    // Assignment handlers
    const handleToggleRole = async (
        userId: string,
        role: "seller" | "manager",
        hasRole: boolean
    ) => {
        if (!storeAssignment.selectedStoreForAssignment) return;

        try {
            if (hasRole) {
                await deleteAssignment(
                    userId,
                    storeAssignment.selectedStoreForAssignment.id,
                    role
                );
            } else {
                await createAssignment(
                    userId,
                    storeAssignment.selectedStoreForAssignment.id,
                    role
                );
            }
            mutate();
        } catch (error) {
            console.error("Error updating assignment:", error);
            alert("Failed to update assignment");
        }
    };

    const handleToggleDefault = async (
        userId: string,
        role: "seller" | "manager",
        isDefault: boolean
    ) => {
        if (!storeAssignment.selectedStoreForAssignment) return;

        try {
            await updateAssignment(
                userId,
                storeAssignment.selectedStoreForAssignment.id,
                role,
                !isDefault
            );
            mutate();
        } catch (error) {
            console.error("Error updating default:", error);
            alert("Failed to update default store");
        }
    };

    // Utility function
    const getAssignedUsers = (storeId: string): AssignedUser[] => {
        const storeAssignments = assignments[storeId] || [];
        const userMap = new Map<
            string,
            { user: User; roles: string[]; hasDefault: boolean }
        >();

        storeAssignments.forEach((assignment) => {
            const user = users.find((u) => u.id === assignment.user_id);
            if (user) {
                if (!userMap.has(user.id)) {
                    userMap.set(user.id, {
                        user,
                        roles: [],
                        hasDefault: false,
                    });
                }
                const userData = userMap.get(user.id)!;
                userData.roles.push(assignment.role);
                if (assignment.is_default) {
                    userData.hasDefault = true;
                }
            }
        });

        return Array.from(userMap.values());
    };

    // if (isLoading) return <div>Loading stores...</div>;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 text-sm">
                        Loading stores...
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
                            Stores Management
                        </h1>
                        <p className="text-gray-600">
                            Manage stores, assign users, and configure
                            permissions
                        </p>
                    </div>
                    <button
                        onClick={storeForm.openCreateForm}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex gap-2 items-center justify-center text-sm font-medium"
                    >
                        Add Store
                        <HousePlus size={18} />
                    </button>
                </div>

                <div className="pt-4">
                    <StoresSearchFilter
                        searchQuery={storeFilters.searchQuery}
                        onSearchChange={storeFilters.setSearchQuery}
                        selectedUserId={storeFilters.selectedUserId}
                        onUserFilterChange={storeFilters.setSelectedUserId}
                        users={users}
                        totalStores={stores.length}
                        filteredStoresCount={storeFilters.filteredStores.length}
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
                <StoreList
                    stores={storeFilters.filteredStores}
                    getAssignedUsers={getAssignedUsers}
                    openStoreAssignmentModal={
                        storeAssignment.openAssignmentModal
                    }
                    handleEditStore={storeForm.openEditForm}
                    handleDeleteStore={handleDeleteStore}
                />
            </div>

            {storeFilters.filteredStores.length === 0 && stores.length > 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                        No stores match your current filters
                    </p>
                    <button
                        onClick={storeFilters.clearFilters}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            )}
            {/* Empty State */}
            {stores.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No stores found</p>
                    <button
                        onClick={storeForm.openCreateForm}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                        Add Your First Store
                    </button>
                </div>
            )}
            {/* Modals */}
            <StoreFormModal
                isOpen={storeForm.showStoreForm}
                storeForm={storeForm.storeForm}
                editingStore={storeForm.editingStore}
                onSubmit={handleStoreSubmit}
                onClose={storeForm.closeForm}
                onFormChange={storeForm.setStoreForm}
            />
            <StoreAssignmentModal
                isOpen={storeAssignment.showStoreAssignmentForm}
                store={storeAssignment.selectedStoreForAssignment}
                users={users}
                assignments={assignments}
                searchQuery={storeAssignment.searchQuery}
                onClose={storeAssignment.closeAssignmentModal}
                onSearchChange={storeAssignment.setSearchQuery}
                onToggleRole={handleToggleRole}
                onToggleDefault={handleToggleDefault}
            />
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                store={deleteModal.store}
                onClose={() => setDeleteModal({ isOpen: false, store: null })}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
