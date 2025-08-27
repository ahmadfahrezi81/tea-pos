//components/stores/StoresPageComponent.tsx
"use client";
import { useState, useMemo } from "react";
import useStoresData, {
    useStoreActions,
    useAssignmentActions,
} from "@/lib/hooks/useStores";

interface Store {
    id: string;
    name: string;
    address: string | null;
    created_at: string;
}

interface User {
    id: string;
    full_name: string;
    email: string;
}

interface Assignment {
    user_id: string;
    role: "seller" | "manager";
    is_default: boolean;
}

export default function StoresPageComponents() {
    const [showStoreForm, setShowStoreForm] = useState(false);
    const [showStoreAssignmentForm, setShowStoreAssignmentForm] =
        useState(false);
    const [storeForm, setStoreForm] = useState({ name: "", address: "" });
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [selectedStoreForAssignment, setSelectedStoreForAssignment] =
        useState<Store | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const { data, isLoading, mutate } = useStoresData();
    const { createStore, updateStore, deleteStore } = useStoreActions();
    const { createAssignment, deleteAssignment, updateAssignment } =
        useAssignmentActions();

    const { stores = [], users = [], assignments = {} } = data || {};

    // Filter and sort users for assignment modal
    const filteredAndSortedUsers = useMemo(() => {
        if (!selectedStoreForAssignment) return [];

        const storeAssignments =
            assignments[selectedStoreForAssignment.id] || [];
        const assignedUserIds = new Set(storeAssignments.map((a) => a.user_id));

        const filtered = users.filter(
            (user) =>
                user.full_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sort: assigned users first, then alphabetical
        return filtered.sort((a, b) => {
            const aAssigned = assignedUserIds.has(a.id);
            const bAssigned = assignedUserIds.has(b.id);

            if (aAssigned && !bAssigned) return -1;
            if (!aAssigned && bAssigned) return 1;

            return a.full_name.localeCompare(b.full_name);
        });
    }, [users, selectedStoreForAssignment, assignments, searchQuery]);

    const handleStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingStore) {
                await updateStore(
                    editingStore.id,
                    storeForm.name,
                    storeForm.address
                );
            } else {
                await createStore(storeForm.name, storeForm.address);
            }

            setStoreForm({ name: "", address: "" });
            setShowStoreForm(false);
            setEditingStore(null);
            mutate();
        } catch (error) {
            console.error("Error saving store:", error);
            alert("Failed to save store");
        }
    };

    const handleEditStore = (store: Store) => {
        setEditingStore(store);
        setStoreForm({ name: store.name, address: store.address || "" });
        setShowStoreForm(true);
    };

    const handleDeleteStore = async (storeId: string) => {
        if (!confirm("Are you sure you want to delete this store?")) return;

        try {
            await deleteStore(storeId);
            mutate();
        } catch (error) {
            console.error("Error deleting store:", error);
            alert("Failed to delete store");
        }
    };

    const handleToggleRole = async (
        userId: string,
        role: "seller" | "manager",
        hasRole: boolean
    ) => {
        if (!selectedStoreForAssignment) return;

        try {
            if (hasRole) {
                await deleteAssignment(
                    userId,
                    selectedStoreForAssignment.id,
                    role
                );
            } else {
                await createAssignment(
                    userId,
                    selectedStoreForAssignment.id,
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
        if (!selectedStoreForAssignment) return;

        try {
            await updateAssignment(
                userId,
                selectedStoreForAssignment.id,
                role,
                !isDefault
            );
            mutate();
        } catch (error) {
            console.error("Error updating default:", error);
            alert("Failed to update default store");
        }
    };

    const openStoreAssignmentModal = (store: Store) => {
        setSelectedStoreForAssignment(store);
        setSearchQuery("");
        setShowStoreAssignmentForm(true);
    };

    const getUserAssignmentForStore = (
        userId: string,
        storeId: string,
        role: "seller" | "manager"
    ): Assignment | undefined => {
        return assignments[storeId]?.find(
            (a) => a.user_id === userId && a.role === role
        );
    };

    const getAssignedUsers = (storeId: string) => {
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

    if (isLoading) return <div>Loading stores...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Stores Management</h1>
                <button
                    onClick={() => setShowStoreForm(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Add Store
                </button>
            </div>

            {/* Store Form Modal */}
            {showStoreForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">
                            {editingStore ? "Edit Store" : "Add New Store"}
                        </h2>
                        <form
                            onSubmit={handleStoreSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Store Name
                                </label>
                                <input
                                    type="text"
                                    value={storeForm.name}
                                    onChange={(e) =>
                                        setStoreForm({
                                            ...storeForm,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Address
                                </label>
                                <textarea
                                    value={storeForm.address}
                                    onChange={(e) =>
                                        setStoreForm({
                                            ...storeForm,
                                            address: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded h-24"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="submit"
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                >
                                    {editingStore ? "Update" : "Create"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStoreForm(false);
                                        setEditingStore(null);
                                        setStoreForm({ name: "", address: "" });
                                    }}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Store Assignment Modal - Compact List Design */}
            {showStoreAssignmentForm && selectedStoreForAssignment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-semibold mb-4">
                                Manage Users - {selectedStoreForAssignment.name}
                            </h2>
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* User List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {filteredAndSortedUsers.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    {searchQuery
                                        ? "No users found matching your search."
                                        : "No users available."}
                                </p>
                            ) : (
                                filteredAndSortedUsers.map((user) => {
                                    const sellerAssignment =
                                        getUserAssignmentForStore(
                                            user.id,
                                            selectedStoreForAssignment.id,
                                            "seller"
                                        );
                                    const managerAssignment =
                                        getUserAssignmentForStore(
                                            user.id,
                                            selectedStoreForAssignment.id,
                                            "manager"
                                        );
                                    const hasAnyRole =
                                        !!sellerAssignment ||
                                        !!managerAssignment;

                                    return (
                                        <div
                                            key={user.id}
                                            className={`p-4 border rounded-lg transition-colors ${
                                                hasAnyRole
                                                    ? "bg-blue-50 border-blue-200"
                                                    : "bg-gray-50 border-gray-200"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">
                                                        {user.full_name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        {user.email}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Seller Role */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                handleToggleRole(
                                                                    user.id,
                                                                    "seller",
                                                                    !!sellerAssignment
                                                                )
                                                            }
                                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                                                sellerAssignment
                                                                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                                                                    : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-blue-50"
                                                            }`}
                                                        >
                                                            Seller
                                                        </button>

                                                        {sellerAssignment && (
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        sellerAssignment.is_default
                                                                    }
                                                                    onChange={() =>
                                                                        handleToggleDefault(
                                                                            user.id,
                                                                            "seller",
                                                                            sellerAssignment.is_default
                                                                        )
                                                                    }
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:bg-yellow-500 transition-colors duration-200"></div>
                                                                <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 transform peer-checked:translate-x-full"></div>
                                                            </label>
                                                        )}
                                                    </div>

                                                    {/* Manager Role */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                handleToggleRole(
                                                                    user.id,
                                                                    "manager",
                                                                    !!managerAssignment
                                                                )
                                                            }
                                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                                                managerAssignment
                                                                    ? "bg-green-100 text-green-800 border border-green-300"
                                                                    : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-green-50"
                                                            }`}
                                                        >
                                                            Manager
                                                        </button>
                                                        {managerAssignment && (
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        managerAssignment.is_default
                                                                    }
                                                                    onChange={() =>
                                                                        handleToggleDefault(
                                                                            user.id,
                                                                            "manager",
                                                                            managerAssignment.is_default
                                                                        )
                                                                    }
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:bg-yellow-500 transition-colors duration-200"></div>
                                                                <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 transform peer-checked:translate-x-full"></div>
                                                                {/* <span className="ml-3 text-sm text-gray-700">
                                                                    Default
                                                                    Manager
                                                                </span> */}
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">
                                    ⭐ marks default store for each role
                                </p>
                                <button
                                    onClick={() => {
                                        setShowStoreAssignmentForm(false);
                                        setSelectedStoreForAssignment(null);
                                        setSearchQuery("");
                                    }}
                                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store) => {
                    const assignedUsers = getAssignedUsers(store.id);

                    return (
                        <div
                            key={store.id}
                            className="bg-white p-6 rounded-lg shadow-md"
                        >
                            <h3 className="text-lg font-semibold mb-2">
                                {store.name}
                            </h3>
                            {store.address && (
                                <p className="text-gray-600 mb-4 text-sm">
                                    {store.address}
                                </p>
                            )}

                            <div className="mb-4">
                                <h4 className="font-medium mb-2 text-sm">
                                    Assigned Users:
                                </h4>
                                {assignedUsers.length > 0 ? (
                                    <div className="space-y-2">
                                        {assignedUsers.map(
                                            ({ user, roles, hasDefault }) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span className="text-sm text-gray-700">
                                                        {user.full_name}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {roles.map((role) => (
                                                            <span
                                                                key={role}
                                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    role ===
                                                                    "seller"
                                                                        ? "bg-blue-100 text-blue-700"
                                                                        : "bg-green-100 text-green-700"
                                                                }`}
                                                            >
                                                                {role}
                                                            </span>
                                                        ))}

                                                        {hasDefault && (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                                Default
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        No users assigned
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() =>
                                        openStoreAssignmentModal(store)
                                    }
                                    className="flex-1 bg-purple-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-600"
                                >
                                    Manage Users
                                </button>
                                <button
                                    onClick={() => handleEditStore(store)}
                                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteStore(store.id)}
                                    className="px-3 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
                                >
                                    Delete
                                </button>
                            </div>

                            <div className="mt-3 text-xs text-gray-500">
                                Created:{" "}
                                {new Date(
                                    store.created_at
                                ).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {stores.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No stores found</p>
                    <button
                        onClick={() => setShowStoreForm(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Add Your First Store
                    </button>
                </div>
            )}
        </div>
    );
}
