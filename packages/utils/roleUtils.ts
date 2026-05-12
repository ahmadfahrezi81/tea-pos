import type {
    StoreListResponse,
    StoreAssignmentResponse,
} from "@tea-pos/features/stores/schema";

export type Assignment = StoreAssignmentResponse;
export type Assignments = StoreListResponse["assignments"];
