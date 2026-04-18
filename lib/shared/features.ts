// lib/shared/features.ts
export const Features = ["qris", "new-dashboard", "export-pdf"] as const;

export type Feature = (typeof Features)[number];

const enabled = new Set(
    (process.env.NEXT_PUBLIC_FEATURES ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
);

export const isEnabled = (feature: Feature) => enabled.has(feature);
