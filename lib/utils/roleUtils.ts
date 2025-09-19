import { Assignments } from "@/app/mobile/layout";

export const hasManagerRole = (
    userId: string,
    assignments: Assignments
): boolean => {
    if (!userId || !assignments) return false;

    return Object.values(assignments).some((storeAssignments) =>
        storeAssignments.some(
            (assignment) =>
                assignment.user_id === userId && assignment.role === "manager"
        )
    );
};

export const hasSellerRole = (
    userId: string,
    assignments: Assignments
): boolean => {
    if (!userId || !assignments) return false;

    return Object.values(assignments).some((storeAssignments) =>
        storeAssignments.some(
            (assignment) =>
                assignment.user_id === userId && assignment.role === "seller"
        )
    );
};

export const hasSellerRoleInStore = (
    userId: string,
    storeId: string,
    assignments: Assignments
): boolean => {
    if (!userId || !storeId || !assignments?.[storeId]) return false;

    return assignments[storeId].some(
        (assignment) =>
            assignment.user_id === userId && assignment.role === "seller"
    );
};

export const hasManagerRoleInStore = (
    userId: string,
    storeId: string,
    assignments: Assignments
): boolean => {
    if (!userId || !storeId || !assignments?.[storeId]) return false;

    return assignments[storeId].some(
        (assignment) =>
            assignment.user_id === userId && assignment.role === "manager"
    );
};
