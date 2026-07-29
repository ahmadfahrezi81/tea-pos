"use client";
import { RefObject, useEffect } from "react";

/** How close to the left edge a touch must start to count as a back gesture. */
const EDGE_PX = 24;
/** How far it must travel right before the gesture fires. */
const TRIGGER_PX = 70;

interface Options {
    /** The element the gesture is listened for on — the shell's scroll region. */
    containerRef: RefObject<HTMLElement | null>;
    /** Only subpages have somewhere to go back to. */
    enabled: boolean;
    onBack: () => void;
}

/**
 * Walks up from the touch target looking for something that owns horizontal
 * dragging itself — a carousel, a scrollable table, the map. Starting a back
 * gesture on top of one of those would steal the interaction.
 */
function ownsHorizontalDrag(target: EventTarget | null, root: Element): boolean {
    let node = target instanceof Element ? target : null;
    if (node?.closest(".mapboxgl-map, .leaflet-container")) return true;

    while (node && node !== root) {
        if (node.scrollWidth > node.clientWidth + 1) {
            const { overflowX } = getComputedStyle(node);
            if (overflowX === "auto" || overflowX === "scroll") return true;
        }
        node = node.parentElement;
    }
    return false;
}

/**
 * Swipe in from the left edge to go back.
 *
 * An installed iOS PWA runs with no browser chrome at all — no back button and
 * no system edge gesture — so without this the only way out of a subpage is the
 * header arrow. This fires back as a discrete gesture rather than dragging the
 * page with the finger, which would need a page transition to drag.
 */
export function useEdgeSwipeBack({ containerRef, enabled, onBack }: Options) {
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !enabled) return;

        let startX = 0;
        let startY = 0;
        let armed = false;

        const onTouchStart = (e: TouchEvent) => {
            armed = false;
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            if (touch.clientX > EDGE_PX) return;
            if (ownsHorizontalDrag(e.target, el)) return;

            startX = touch.clientX;
            startY = touch.clientY;
            armed = true;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!armed) return;

            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            // Vertical intent wins — the user is scrolling, not going back.
            if (Math.abs(dy) > Math.abs(dx)) {
                armed = false;
                return;
            }
            if (dx > TRIGGER_PX) {
                armed = false;
                onBack();
            }
        };

        const disarm = () => {
            armed = false;
        };

        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: true });
        el.addEventListener("touchend", disarm, { passive: true });
        el.addEventListener("touchcancel", disarm, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", disarm);
            el.removeEventListener("touchcancel", disarm);
        };
    }, [containerRef, enabled, onBack]);
}
