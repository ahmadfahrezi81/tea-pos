"use client";

import { useEffect, useState } from "react";

/**
 * TEMPORARY — diagnosing the Android PWA footer clipping. Set to false (or
 * delete this component and its mount in mobile/layout.tsx) once we know which
 * number the browser is getting wrong.
 */
const SHOW_VIEWPORT_DEBUG = true;

/**
 * Live readout of every height the page can see.
 *
 * The point is to find out which of these disagrees with the screen when the
 * footer is clipped. `inner` is what vh/dvh resolve against and what any
 * measuring fix would read, so if `inner` is larger than the visible area then
 * nothing inside the page can fix this and it has to be handled at the viewport
 * meta / manifest level instead.
 */
export default function ViewportDebug() {
    const [lines, setLines] = useState<string[]>([]);

    useEffect(() => {
        if (!SHOW_VIEWPORT_DEBUG) return;

        // env() is only readable through a real element, so park an invisible
        // one at the bottom and measure what the inset resolves to.
        const probe = document.createElement("div");
        probe.style.cssText =
            "position:fixed;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom);pointer-events:none;";
        document.body.appendChild(probe);

        const read = () => {
            const vv = window.visualViewport;
            const shell = document.querySelector<HTMLElement>("[data-shell-root]");
            setLines([
                `inner   ${window.innerHeight}`,
                `visual  ${vv ? Math.round(vv.height) : "-"} off ${vv ? Math.round(vv.offsetTop) : "-"}`,
                `doc     ${document.documentElement.clientHeight}`,
                `screen  ${window.screen.height} / avail ${window.screen.availHeight}`,
                `shell   ${shell ? Math.round(shell.getBoundingClientRect().height) : "-"}`,
                `sa-bot  ${Math.round(probe.getBoundingClientRect().height)}`,
                `dpr ${window.devicePixelRatio}  standalone ${
                    window.matchMedia("(display-mode: standalone)").matches ? "yes" : "no"
                }`,
            ]);
        };

        read();
        const interval = setInterval(read, 500);

        return () => {
            clearInterval(interval);
            probe.remove();
        };
    }, []);

    if (!SHOW_VIEWPORT_DEBUG || lines.length === 0) return null;

    return (
        <div className="fixed top-0 left-0 z-[100] bg-black/75 text-green-300 text-[10px] leading-tight font-mono p-1.5 rounded-br-lg pointer-events-none whitespace-pre">
            {lines.join("\n")}
        </div>
    );
}
