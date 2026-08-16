"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tenantConfigApi } from "@/lib/api/tenant-config";
import type { PayFrequencySchema } from "@tea-pos/features/tenants/schema";

/* No SWR here: the current cadence comes from PayFrequencyProvider, which the
   mobile layout renders server-side. This hook only writes — and then refreshes
   the server tree so every screen picks the new schedule up without a reload. */
export function usePayFrequencyConfig() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const save = async (payFrequency: PayFrequencySchema) => {
        setIsSaving(true);
        try {
            const result = await tenantConfigApi.setPayFrequency({ payFrequency });
            router.refresh();
            return result;
        } finally {
            setIsSaving(false);
        }
    };

    return { save, isSaving };
}
