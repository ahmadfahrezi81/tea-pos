import type { CSSProperties } from "react";

/**
 * A dot grid painted with one repeating radial-gradient — no image to request
 * and no element per dot. The mask fades it out toward the edges so it reads as
 * texture behind the art rather than a panel with a hard border.
 *
 * Apply it to an absolutely positioned layer behind the artwork it sits under;
 * the layer needs a size, this only paints it.
 */
export const DOT_GRID: CSSProperties = {
    backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
    backgroundSize: "14px 14px",
    WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 72%)",
    maskImage: "radial-gradient(ellipse at center, black 20%, transparent 72%)",
};
