"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { flagsApi, type Flags } from "@/lib/api/flags";
import { useStore } from "@/lib/context/StoreContext";

const DEFAULT_FLAGS: Flags = {
    qris: false,
    payroll: false,
    reimbursement: false,
    skipManagePhotos: false,
};

const FlagsContext = createContext<Flags>(DEFAULT_FLAGS);

export function FlagsProvider({ children }: { children: React.ReactNode }) {
    const { selectedStoreId } = useStore();

    const { data } = useSWR(
        ["flags", selectedStoreId],
        ([, storeId]) => flagsApi.get(storeId || undefined),
        {
            fallbackData: DEFAULT_FLAGS,
            revalidateOnFocus: false,
            dedupingInterval: 60_000,
        },
    );

    return (
        <FlagsContext.Provider value={data ?? DEFAULT_FLAGS}>
            {children}
        </FlagsContext.Provider>
    );
}

export function useFlags(): Flags {
    return useContext(FlagsContext);
}
