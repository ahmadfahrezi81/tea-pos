import { PhotoType } from "@/lib/shared/schemas/daily-summary-photos";

export const PHOTO_SLOTS: {
    type: PhotoType;
    label: string;
}[] = [
    { type: "closing:ice", label: "Ice Bin" },
    { type: "closing:syrup", label: "Syrup" },
    { type: "closing:bags", label: "Bags" },
    { type: "closing:cups", label: "Cups" },
    { type: "closing:tea", label: "Tea Waste" },
];
