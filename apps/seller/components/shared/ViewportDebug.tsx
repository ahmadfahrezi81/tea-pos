"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TEMPORARY — diagnosing the Android PWA footer clipping. Set to false (or
 * delete this component and its mount in mobile/layout.tsx) once we know which
 * number the browser is getting wrong.
 */
const SHOW_VIEWPORT_DEBUG = true;

/** Survives reloads and app kills, which is the point — see the note below. */
const LOG_KEY = "viewport-debug-log";
const MAX_ENTRIES = 60;

interface Sample {
    t: string;
    inner: number;
    visual: number;
    screen: number;
    /** What prompted the sample: a resume, or just a value that moved. */
    tag: string;
}

function loadLog(): Sample[] {
    try {
        const raw = localStorage.getItem(LOG_KEY);
        return raw ? (JSON.parse(raw) as Sample[]) : [];
    } catch {
        return [];
    }
}

/**
 * Records every height the page can see, and every time one of them moves.
 *
 * The bug will not reproduce on demand, so catching it live is not a plan. This
 * keeps a rolling log instead: use the app normally, and when the footer next
 * looks wrong, the log already says what changed and in what order. Entries are
 * kept in localStorage so they outlive both a reload and killing the app —
 * killing it is the thing that clears the symptom, and we need the evidence
 * from before that happened.
 *
 * `inner` is what vh/dvh resolve against and what any in-page fix would read.
 * If it grows while the visible area does not, that is the bug; if `visual`
 * stays correct at the same moment, the fix is to measure that instead.
 */
export default function ViewportDebug() {
    const [lines, setLines] = useState<string[]>([]);
    const [log, setLog] = useState<Sample[]>([]);
    const [expanded, setExpanded] = useState(false);
    /** Whether the stored log has been folded in yet — see record() below. */
    const hydrated = useRef(false);

    useEffect(() => {
        if (!SHOW_VIEWPORT_DEBUG) return;

        // env() is only readable through a real element, so park an invisible
        // one at the bottom and measure what the inset resolves to.
        const probe = document.createElement("div");
        probe.style.cssText =
            "position:fixed;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom);pointer-events:none;";
        document.body.appendChild(probe);

        let last = "";

        const record = (tag: string) => {
            const vv = window.visualViewport;
            const sample: Sample = {
                t: new Date().toLocaleTimeString("en-GB"),
                inner: window.innerHeight,
                visual: vv ? Math.round(vv.height) : -1,
                screen: window.screen.height,
                tag,
            };
            // Only log movement, or an explicit event — otherwise the interval
            // would bury the interesting entries under identical ones.
            const key = `${sample.inner}/${sample.visual}/${sample.screen}`;
            if (key === last && !tag) return;
            last = key;

            setLog((prev) => {
                // Read the stored log here rather than in the effect body:
                // touching localStorage during render or setting state up front
                // are both things React would rather we did not do.
                const base = hydrated.current ? prev : loadLog();
                hydrated.current = true;
                const next = [...base, sample].slice(-MAX_ENTRIES);
                try {
                    localStorage.setItem(LOG_KEY, JSON.stringify(next));
                } catch {
                    // A full quota must not take the app down with it.
                }
                return next;
            });
        };

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
            ]);
            record("");
        };

        // Tag the events we most suspect, so the log shows not just that a
        // number moved but what the app was being put through when it did.
        const onVisibility = () =>
            record(document.visibilityState === "visible" ? "RESUME" : "hide");
        const onPageShow = () => record("pageshow");
        const onFocus = () => record("focus");
        const onOrientation = () => record("rotate");
        const onResize = () => record("resize");

        read();
        const interval = setInterval(read, 500);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onPageShow);
        window.addEventListener("focus", onFocus);
        window.addEventListener("orientationchange", onOrientation);
        window.addEventListener("resize", onResize);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pageshow", onPageShow);
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("orientationchange", onOrientation);
            window.removeEventListener("resize", onResize);
            probe.remove();
        };
    }, []);

    const clearLog = useCallback(() => {
        try {
            localStorage.removeItem(LOG_KEY);
        } catch {
            // Nothing to do; the display below resets either way.
        }
        setLog([]);
    }, []);

    if (!SHOW_VIEWPORT_DEBUG || lines.length === 0) return null;

    return (
        <div className="fixed top-0 left-0 z-[100] max-w-[85vw] bg-black/80 text-green-300 text-[10px] leading-tight font-mono rounded-br-lg">
            <div className="p-1.5 whitespace-pre" onClick={() => setExpanded((v) => !v)}>
                {lines.join("\n")}
                {`\nlog ${log.length}  ${expanded ? "(tap to hide)" : "(tap to show)"}`}
            </div>

            {expanded && (
                <div className="border-t border-white/20 p-1.5 max-h-[45vh] overflow-y-auto">
                    {log.length === 0 && <div className="text-gray-400">no entries yet</div>}
                    {log.map((s, i) => (
                        <div key={i} className={s.tag === "RESUME" ? "text-yellow-300" : ""}>
                            {`${s.t} in${s.inner} vv${s.visual} sc${s.screen} ${s.tag}`}
                        </div>
                    ))}
                    <button
                        onClick={clearLog}
                        className="mt-1.5 px-2 py-1 rounded bg-white/15 text-white"
                    >
                        clear log
                    </button>
                </div>
            )}
        </div>
    );
}
