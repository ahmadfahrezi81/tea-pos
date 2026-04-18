// lib/client/context/features-provider.tsx
"use client";

import { createContext, useContext } from "react";
import { Features, isEnabled, type Feature } from "@/lib/shared/features";

type FeaturesContext = Record<Feature, boolean>;

const value = Features.reduce((acc, feature) => {
    acc[feature] = isEnabled(feature);
    return acc;
}, {} as FeaturesContext);

const FeaturesContext = createContext<FeaturesContext>(value);

export const useFeatures = () => useContext(FeaturesContext);

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
    return (
        <FeaturesContext.Provider value={value}>
            {children}
        </FeaturesContext.Provider>
    );
}
