import { apiFetch } from "./client";
import { z } from "zod";

export const FlagsResponse = z.object({
    qris: z.boolean(),
    payroll: z.boolean(),
    reimbursement: z.boolean(),
    skipManagePhotos: z.boolean(),
});

export type Flags = z.infer<typeof FlagsResponse>;

export const flagsApi = {
    get: async (storeId?: string): Promise<Flags> => {
        const url = storeId ? `/api/flags?storeId=${storeId}` : "/api/flags";
        return FlagsResponse.parse(await apiFetch<unknown>(url));
    },
};
