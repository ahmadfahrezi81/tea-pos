import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

export const SUPPLY_REQUEST_TYPES = ["cups", "bags", "syrup", "ice", "tea", "other"] as const;
export type SupplyRequestType = (typeof SUPPLY_REQUEST_TYPES)[number];

export const SUPPLY_REQUEST_TYPE_LABELS: Record<SupplyRequestType, string> = {
    cups: "Cups",
    bags: "Bags",
    syrup: "Syrup",
    ice: "Ice",
    tea: "Tea",
    other: "Other",
};

export const CreateSupplyRequestInput = z.object({
    storeId: UUIDSchema,
    dailySummaryId: UUIDSchema.optional(),
    type: z.enum(SUPPLY_REQUEST_TYPES),
    notes: z.string().max(500).optional(),
    photoUrl: z.string().url().optional(),
});
export type CreateSupplyRequestInput = z.infer<typeof CreateSupplyRequestInput>;

export const ListSupplyRequestsQuery = z.object({
    storeId: UUIDSchema,
    date: z.string().optional(),
});
export type ListSupplyRequestsQuery = z.infer<typeof ListSupplyRequestsQuery>;

export const SupplyRequestResponse = z.object({
    id: z.string(),
    storeId: z.string(),
    dailySummaryId: z.string().nullable(),
    type: z.enum(SUPPLY_REQUEST_TYPES),
    notes: z.string().nullable(),
    photoUrl: z.string().nullable(),
    status: z.enum(["pending", "acknowledged", "fulfilled"]),
    createdAt: z.string(),
    userId: z.string(),
});
export type SupplyRequestResponse = z.infer<typeof SupplyRequestResponse>;

export const SupplyRequestListResponse = z.object({
    requests: z.array(SupplyRequestResponse),
});
export type SupplyRequestListResponse = z.infer<typeof SupplyRequestListResponse>;
