// components/stores/UserAssignmentRow.tsx
import React from "react";
import { Assignment, User } from "../types/store";

interface UserAssignmentRowProps {
    user: User;
    storeId: string;
    assignments: Record<string, Assignment[]>;
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

export const UserAssignmentRow: React.FC<UserAssignmentRowProps> = ({
    user,
    storeId,
    assignments,
    onToggleRole,
    onToggleDefault,
}) => {
    const getUserAssignmentForStore = (
        userId: string,
        storeId: string,
        role: "seller" | "manager"
    ): Assignment | undefined => {
        return assignments[storeId]?.find(
            (a) => a.user_id === userId && a.role === role
        );
    };

    const sellerAssignment = getUserAssignmentForStore(
        user.id,
        storeId,
        "seller"
    );
    const managerAssignment = getUserAssignmentForStore(
        user.id,
        storeId,
        "manager"
    );
    const hasAnyRole = !!sellerAssignment || !!managerAssignment;

    return (
        <div
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
                    <p className="text-sm text-gray-600">{user.email}</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Seller Role */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() =>
                                onToggleRole(
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
                                    checked={sellerAssignment.is_default}
                                    onChange={() =>
                                        onToggleDefault(
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
                                onToggleRole(
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
                                    checked={managerAssignment.is_default}
                                    onChange={() =>
                                        onToggleDefault(
                                            user.id,
                                            "manager",
                                            managerAssignment.is_default
                                        )
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:bg-yellow-500 transition-colors duration-200"></div>
                                <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 transform peer-checked:translate-x-full"></div>
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
