// components/stores/StoreAssignmentModal.tsx
import React from "react";
import { UserAssignmentRow } from "./UserAssignmentRow";
import { Assignment, Store, User } from "../types/store";

interface StoreAssignmentModalProps {
    isOpen: boolean;
    store: Store | null;
    users: User[];
    assignments: Record<string, Assignment[]>;
    searchQuery: string;
    onClose: () => void;
    onSearchChange: (query: string) => void;
    onToggleRole: (
        userId: string,
        role: "seller" | "manager",
        hasRole: boolean
    ) => void;
    onToggleDefault: (
        userId: string,
        role: "seller" | "manager",
        isDefault: boolean
    ) => void;
}

export const StoreAssignmentModal: React.FC<StoreAssignmentModalProps> = ({
    isOpen,
    store,
    users,
    assignments,
    searchQuery,
    onClose,
    onSearchChange,
    onToggleRole,
    onToggleDefault,
}) => {
    if (!isOpen || !store) return null;

    const filteredUsers = users.filter(
        (user) =>
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort: assigned users first, then alphabetical
    const sortedUsers = filteredUsers.sort((a, b) => {
        const storeAssignments = assignments[store.id] || [];
        const assignedUserIds = new Set(storeAssignments.map((a) => a.user_id));

        const aAssigned = assignedUserIds.has(a.id);
        const bAssigned = assignedUserIds.has(b.id);

        if (aAssigned && !bAssigned) return -1;
        if (!aAssigned && bAssigned) return 1;

        return a.full_name.localeCompare(b.full_name);
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold mb-4">
                        Manage Users - {store.name}
                    </h2>
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {sortedUsers.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            {searchQuery
                                ? "No users found matching your search."
                                : "No users available."}
                        </p>
                    ) : (
                        sortedUsers.map((user) => (
                            <UserAssignmentRow
                                key={user.id}
                                user={user}
                                storeId={store.id}
                                assignments={assignments}
                                onToggleRole={onToggleRole}
                                onToggleDefault={onToggleDefault}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            ⭐ marks default store for each role
                        </p>
                        <button
                            onClick={onClose}
                            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
