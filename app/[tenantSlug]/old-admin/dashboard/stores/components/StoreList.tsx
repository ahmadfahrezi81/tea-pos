import React, { useState } from "react";
import { StoreIcon, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { AssignedUser, Store, User } from "../types/store";

// Component Props Interfaces
interface DropdownMenuProps {
    onEdit: () => void;
    onDelete: () => void;
}

interface RoleBadgeProps {
    role: string;
}

interface UserAssignmentProps {
    user: User;
    roles: string[];
    hasDefault: boolean;
}

interface AssignedUsersSectionProps {
    assignedUsers: AssignedUser[];
}

interface StoreHeaderProps {
    store: Store;
    onEdit: () => void;
    onDelete: () => void;
}

interface StoreCardProps {
    store: Store;
    assignedUsers: AssignedUser[];
    onManageUsers: (store: Store) => void;
    onEditStore: (store: Store) => void;
    onDeleteStore: (store: Store) => void;
}

interface StoreListProps {
    stores: Store[];
    getAssignedUsers: (storeId: string) => AssignedUser[];
    openStoreAssignmentModal: (store: Store) => void;
    handleEditStore: (store: Store) => void;
    handleDeleteStore: (store: Store) => void;
}

// Dropdown Menu Component
const DropdownMenu: React.FC<DropdownMenuProps> = ({ onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleAction = (action: () => void): void => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                type="button"
            >
                <MoreVertical size={18} className="text-gray-600" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close dropdown */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown content */}
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] p-2 space-y-2">
                        <button
                            onClick={() => handleAction(onEdit)}
                            className="w-full px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded"
                            type="button"
                        >
                            <Edit2 size={14} />
                            Edit Store
                        </button>
                        <button
                            onClick={() => handleAction(onDelete)}
                            className="w-full px-2 py-1 text-left text-sm text-red-600 hover:bg-red-100 flex items-center gap-2 rounded"
                            type="button"
                        >
                            <Trash2 size={14} />
                            Delete Store
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// Role Badge Component
const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
    const getBadgeStyles = (role: string): string => {
        switch (role) {
            case "seller":
                return "bg-blue-100 text-blue-700";
            case "manager":
                return "bg-green-100 text-green-700";
            case "Default":
                return "bg-yellow-100 text-yellow-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeStyles(
                role
            )}`}
        >
            {role}
        </span>
    );
};

// User Assignment Component
const UserAssignment: React.FC<UserAssignmentProps> = ({
    user,
    roles,
    hasDefault,
}) => {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{user.full_name}</span>
            <div className="flex items-center gap-1">
                {roles.map((role: string) => (
                    <RoleBadge key={role} role={role} />
                ))}
                {hasDefault && <RoleBadge role="Default" />}
            </div>
        </div>
    );
};

// Assigned Users Section Component
const AssignedUsersSection: React.FC<AssignedUsersSectionProps> = ({
    assignedUsers,
}) => {
    return (
        <div className="mb-2">
            <h4 className="font-medium mb-2 text-sm">Assigned Users:</h4>
            {assignedUsers.length > 0 ? (
                <div className="space-y-2 bg-gray-50 p-2 border border-gray-200 rounded-lg">
                    {assignedUsers.map(
                        ({ user, roles, hasDefault }: AssignedUser) => (
                            <UserAssignment
                                key={user.id}
                                user={user}
                                roles={roles}
                                hasDefault={hasDefault}
                            />
                        )
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-500 italic">
                    No users assigned
                </p>
            )}
        </div>
    );
};

// Store Header Component
const StoreHeader: React.FC<StoreHeaderProps> = ({
    store,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="flex justify-between items-start gap-2">
            <div className="flex gap-2 flex-1">
                <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <StoreIcon size={20} className="text-gray-800" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold">{store.name}</h3>
                    {store.address && (
                        <p className="text-gray-600 text-sm">
                            Address: {store.address}
                        </p>
                    )}
                </div>
            </div>
            <DropdownMenu onEdit={onEdit} onDelete={onDelete} />
        </div>
    );
};

// Individual Store Card Component
const StoreCard: React.FC<StoreCardProps> = ({
    store,
    assignedUsers,
    onManageUsers,
    onEditStore,
    onDeleteStore,
}) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full min-h-[280px]">
            <StoreHeader
                store={store}
                onEdit={() => onEditStore(store)}
                onDelete={() => onDeleteStore(store)}
            />

            {/* Flexible content area that grows */}
            <div className="flex-1 py-2">
                <AssignedUsersSection assignedUsers={assignedUsers} />
            </div>

            {/* Fixed bottom section */}
            <div className="mt-auto space-y-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => onManageUsers(store)}
                        className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                        type="button"
                    >
                        Manage Users
                    </button>
                </div>

                <div className="text-xs text-gray-500">
                    Store Created:{" "}
                    {new Date(store.created_at).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

// Main Store List Component
export const StoreList: React.FC<StoreListProps> = ({
    stores,
    getAssignedUsers,
    openStoreAssignmentModal,
    handleEditStore,
    handleDeleteStore,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4 pb-30">
            {stores.map((store: Store) => {
                const assignedUsers = getAssignedUsers(store.id);

                return (
                    <StoreCard
                        key={store.id}
                        store={store}
                        assignedUsers={assignedUsers}
                        onManageUsers={openStoreAssignmentModal}
                        onEditStore={handleEditStore}
                        onDeleteStore={handleDeleteStore}
                    />
                );
            })}
        </div>
    );
};

// Export types for use in other files
export type {
    User,
    Store,
    AssignedUser,
    StoreListProps,
    StoreCardProps,
    DropdownMenuProps,
    RoleBadgeProps,
    UserAssignmentProps,
    AssignedUsersSectionProps,
    StoreHeaderProps,
};
