"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { flagsApi, type Flags } from "@/lib/api/flags";
import { useStore } from "@/lib/context/StoreContext";

const DEFAULT_FLAGS: Flags = {
    isQrisEnabled: false,
    isReportEnabled: false,
    isRequestEnabled: false,
    isReimbursementEnabled: false,
    isFastOrderEnabled: false,
    isSkipManagePhotosEnabled: false,
    isMaintenanceEnabled: false,
};

type FlagsContextType = {
    flags: Flags;
    isLoading: boolean;
};

const FlagsContext = createContext<FlagsContextType>({
    flags: DEFAULT_FLAGS,
    isLoading: true,
});

export function FlagsProvider({ children }: { children: React.ReactNode }) {
    const { selectedStoreId } = useStore();

    const { data, isLoading } = useSWR(
        ["flags", selectedStoreId],
        ([, storeId]) => flagsApi.get(storeId || undefined),
        {
            fallbackData: DEFAULT_FLAGS,
            revalidateOnFocus: false,
            dedupingInterval: 60_000,
        },
    );

    return (
        <FlagsContext.Provider value={{ flags: data ?? DEFAULT_FLAGS, isLoading }}>
            {children}
        </FlagsContext.Provider>
    );
}

export function useFlags(): FlagsContextType {
    return useContext(FlagsContext);
}
