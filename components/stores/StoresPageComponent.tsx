"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import useStoresData from "@/lib/hooks/useStores";

interface Store {
    id: string;
    name: string;
    address: string | null;
    created_at: string;
}

// interface User {
//     id: string;
//     full_name: string;
//     email: string;
//     role: string;
// }

export default function StoresPageComponents() {
    // const [stores, setStores] = useState<Store[]>([]);
    // const [users, setUsers] = useState<User[]>([]);
    // const [assignments, setAssignments] = useState<Record<string, string[]>>(
    //     {}
    // );
    const [showStoreForm, setShowStoreForm] = useState(false);
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    // const [selectedStore, setSelectedStore] = useState<string>("");
    const [storeForm, setStoreForm] = useState({ name: "", address: "" });
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    // const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const { data, isLoading, mutate } = useStoresData();
    // const { stores, users, assignments } = data;
    const { stores = [], users = [], assignments = {} } = data || {};

    // useEffect(() => {
    //     loadData();
    // }, []);

    // const loadData = async () => {
    //     try {
    //         // Load stores
    //         const { data: storesData } = await supabase
    //             .from("stores")
    //             .select("*")
    //             .order("name");
    //         setStores(storesData || []);

    //         // Load sellers (users with role 'seller')
    //         const { data: usersData } = await supabase
    //             .from("profiles")
    //             .select("*")
    //             .eq("role", "seller")
    //             .order("full_name");
    //         setUsers(usersData || []);

    //         // Load store assignments
    //         const { data: assignmentsData } = await supabase
    //             .from("user_store_assignments")
    //             .select("user_id, store_id");

    //         // Group assignments by store
    //         const assignmentsByStore: Record<string, string[]> = {};
    //         assignmentsData?.forEach((assignment) => {
    //             if (!assignmentsByStore[assignment.store_id]) {
    //                 assignmentsByStore[assignment.store_id] = [];
    //             }
    //             assignmentsByStore[assignment.store_id].push(
    //                 assignment.user_id
    //             );
    //         });
    //         setAssignments(assignmentsByStore);

    //         setLoading(false);
    //     } catch (error) {
    //         console.error("Error loading data:", error);
    //         setLoading(false);
    //     }
    // };

    const handleStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingStore) {
                // Update existing store
                const { error } = await supabase
                    .from("stores")
                    .update({
                        name: storeForm.name,
                        address: storeForm.address || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", editingStore.id);

                if (error) throw error;
            } else {
                // Create new store
                const { error } = await supabase.from("stores").insert({
                    name: storeForm.name,
                    address: storeForm.address || null,
                });

                if (error) throw error;
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
            const { error } = await supabase
                .from("stores")
                .delete()
                .eq("id", storeId);

            if (error) throw error;
            mutate();
        } catch (error) {
            console.error("Error deleting store:", error);
            alert("Failed to delete store");
        }
    };

    const handleAssignUser = async (
        userId: string,
        storeId: string,
        assign: boolean
    ) => {
        try {
            if (assign) {
                const { error } = await supabase
                    .from("user_store_assignments")
                    .insert({ user_id: userId, store_id: storeId });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("user_store_assignments")
                    .delete()
                    .eq("user_id", userId)
                    .eq("store_id", storeId);
                if (error) throw error;
            }
            mutate();
        } catch (error) {
            console.error("Error updating assignment:", error);
            alert("Failed to update assignment");
        }
    };

    // if (loading) return <div>Loading stores...</div>;

    if (isLoading) return <div>Loading stores...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Stores Management</h1>
                <div className="space-x-4">
                    <button
                        onClick={() => setShowStoreForm(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Add Store
                    </button>
                    <button
                        onClick={() => setShowAssignmentForm(true)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        Manage Assignments
                    </button>
                </div>
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

            {/* Assignment Form Modal */}
            {showAssignmentForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-96 overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">
                            Manage Store Assignments
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-gray-300 p-2 text-left">
                                            Seller
                                        </th>
                                        {stores.map((store) => (
                                            <th
                                                key={store.id}
                                                className="border border-gray-300 p-2 text-center"
                                            >
                                                {store.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="border border-gray-300 p-2 font-medium">
                                                {user.full_name}
                                                <br />
                                                <span className="text-sm text-gray-600">
                                                    {user.email}
                                                </span>
                                            </td>
                                            {stores.map((store) => (
                                                <td
                                                    key={store.id}
                                                    className="border border-gray-300 p-2 text-center"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            assignments[
                                                                store.id
                                                            ]?.includes(
                                                                user.id
                                                            ) || false
                                                        }
                                                        onChange={(e) =>
                                                            handleAssignUser(
                                                                user.id,
                                                                store.id,
                                                                e.target.checked
                                                            )
                                                        }
                                                        className="w-4 h-4"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 text-right">
                            <button
                                onClick={() => setShowAssignmentForm(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stores List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store) => (
                    <div
                        key={store.id}
                        className="bg-white p-6 rounded-lg shadow"
                    >
                        <h3 className="text-lg font-semibold mb-2">
                            {store.name}
                        </h3>
                        {store.address && (
                            <p className="text-gray-600 mb-4">
                                {store.address}
                            </p>
                        )}

                        <div className="mb-4">
                            <h4 className="font-medium mb-2">
                                Assigned Sellers:
                            </h4>
                            {assignments[store.id]?.length > 0 ? (
                                <ul className="text-sm text-gray-600 space-y-1">
                                    {assignments[store.id].map((userId) => {
                                        const user = users.find(
                                            (u) => u.id === userId
                                        );
                                        return user ? (
                                            <li key={userId}>
                                                • {user.full_name}
                                            </li>
                                        ) : null;
                                    })}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 italic">
                                    No sellers assigned
                                </p>
                            )}
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleEditStore(store)}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteStore(store.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                            Created:{" "}
                            {new Date(store.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
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
