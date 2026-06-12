import { apiFetch } from "./client";
import { z } from "zod";

export const FlagsResponse = z.object({
    isQrisEnabled: z.boolean(),
    isReportEnabled: z.boolean(),
    isRequestEnabled: z.boolean(),
    isReimbursementEnabled: z.boolean(),
    isFastOrderEnabled: z.boolean(),
    isSkipManagePhotosEnabled: z.boolean(),
});

export type Flags = z.infer<typeof FlagsResponse>;

export const flagsApi = {
    get: async (storeId?: string): Promise<Flags> => {
        const url = storeId ? `/api/flags?storeId=${storeId}` : "/api/flags";
        return FlagsResponse.parse(await apiFetch<unknown>(url));
    },
};
