// lib/hooks/useBrandColor.ts
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";

const BLUE = "oklch(0.546 0.245 262.881)";
const ROSE = "oklch(0.645 0.246 16.439)";

export function useBrandColor() {
    const { fastOrderMode } = useFastOrderMode();
    return fastOrderMode ? ROSE : BLUE;
}
