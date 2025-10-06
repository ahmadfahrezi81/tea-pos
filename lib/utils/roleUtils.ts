import type {
    StoreListResponse,
    StoreAssignmentResponse,
} from "@/lib/schemas/stores";

// 👇 Single assignment type (already camelCase)
export type Assignment = StoreAssignmentResponse;

// 👇 All assignments grouped by storeId
export type Assignments = StoreListResponse["assignments"];

export const hasManagerRole = (
    userId: string,
    assignments: Assignments
): boolean => {
    if (!userId || !assignments) return false;

    return Object.values(assignments).some((storeAssignments) =>
        storeAssignments.some(
            (assignment) =>
                assignment.userId === userId && assignment.role === "manager"
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
                assignment.userId === userId && assignment.role === "seller"
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
            assignment.userId === userId && assignment.role === "seller"
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
            assignment.userId === userId && assignment.role === "manager"
    );
};
