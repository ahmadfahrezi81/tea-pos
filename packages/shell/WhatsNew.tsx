"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Icon } from "@iconify/react";
import { PatchNotes, type PatchNote } from "@tea-pos/ui/custom/PatchNotes";
import { DOT_GRID } from "@tea-pos/ui/styles/dot-grid";
import "@tea-pos/ui/icons/bundled-emoji";

/** The version whose notes the reader has already been shown. */
const LAST_SEEN_KEY = "tea-pos:last-seen-version";

/**
 * Sub-pixel rounding on a phone leaves `scrollHeight - scrollTop -
 * clientHeight` a fraction above zero at the true bottom, which would strand
 * the button on "scroll to continue" with nothing left to scroll.
 */
const BOTTOM_SLACK_PX = 8;

/**
 * Three states, not two. `useAppUpdate`'s helper collapses "the key is absent"
 * and "the read threw" into one `null`, which is right there — nothing
 * remembered means say nothing, and silence is the safe direction.
 *
 * Here the safe direction is inverted: an absent key means *show the newest
 * release*, so a device whose storage always throws would look like a first run
 * on every open. The screen would appear, the dismissal would fail to write,
 * and the next open would be identical, forever.
 */
type Stored = { ok: true; value: string | null } | { ok: false };

function readLastSeen(): Stored {
    try {
        return { ok: true, value: localStorage.getItem(LAST_SEEN_KEY) };
    } catch {
        return { ok: false };
    }
}

function writeLastSeen(version: string) {
    try {
        localStorage.setItem(LAST_SEEN_KEY, version);
    } catch {
        // Nothing recoverable. The screen is already closing.
    }
}

function part(parts: number[], i: number): number {
    const value = parts[i];
    // A non-numeric segment parses to NaN, and NaN fails every comparison, so a
    // newer version would read as "not newer" and this screen would silently
    // never appear again. Neither app tags releases today; this is a guard.
    return Number.isFinite(value) ? value : 0;
}

/**
 * Numerically, part by part — never as strings. `"5.4.10" < "5.4.9"` is true as
 * strings and false as versions, and the seller app moves fast enough to reach
 * double digits within weeks of any given release.
 */
function isNewer(a: string, b: string): boolean {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if (part(pa, i) !== part(pb, i)) return part(pa, i) > part(pb, i);
    }
    return false;
}

/**
 * Which releases this reader has not been shown.
 *
 * A **filter**, not an index lookup: the stored version need not appear in the
 * array at all. A release with nothing user-visible gets no card, and the seller
 * list starts at `5.0.2`, so a reader can legitimately hold a version that is
 * not in it. Searching for its index would return `-1` and take the whole list
 * with it.
 */
function unseen(notes: PatchNote[], stored: Stored): PatchNote[] | null {
    if (!stored.ok) return null;
    // First run — including the first run of the release that ships this screen,
    // because nobody had the key before it existed. One card rather than none:
    // seeding silently would mean this feature could not announce itself, and
    // one card is just as far from handing a new install the full history.
    if (stored.value === null) return notes.slice(0, 1);
    // Bound to a local because the narrowing above does not survive into the
    // callback — `stored` is a parameter the compiler must assume can change.
    const seen = stored.value;
    return notes.filter((note) => isNewer(note.version, seen));
}

export interface WhatsNewCopy {
    title: string;
    /** Shown while there is still list below the fold. */
    scrollToContinue: string;
    /** Shown once the bottom has been reached. */
    gotIt: string;
    close: string;
}

/**
 * The release notes, once, for someone who just landed on a version they have
 * not seen the notes for.
 *
 * The archive under `More → Patch Notes` is the same data and is always there;
 * this is the announcement. It is a deliberate exception to that screen's "do
 * not demand attention" rule, earned by appearing at most once per version.
 *
 * Data and copy are props: the two apps have unrelated version lines (seller
 * `5.4.x`, backoffice `1.0.x`) and only one of them has an i18n layer, so
 * nothing in here knows which app it is rendering.
 */
export default function WhatsNew({
    notes,
    version,
    copy,
}: {
    notes: PatchNote[];
    /** `NEXT_PUBLIC_APP_VERSION` for this app. */
    version: string | undefined;
    copy: WhatsNewCopy;
}) {
    const [releases, setReleases] = useState<PatchNote[] | null>(null);
    const [atBottom, setAtBottom] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!version) return;
        const stored = readLastSeen();
        const pending = unseen(notes, stored);
        if (!pending) return;

        if (pending.length === 0) {
            // The version moved but earned no card. Nothing was withheld, so
            // there is nothing to save for later — record it and stay quiet,
            // rather than recomputing the same empty answer next release.
            writeLastSeen(version);
            return;
        }
        setReleases(pending);
    }, [notes, version]);

    /**
     * Whether the list even overflows is only knowable after it renders, and a
     * list that fits must not demand a scroll that cannot happen. Measured on
     * open rather than assumed.
     */
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        setAtBottom(element.scrollHeight - element.clientHeight <= BOTTOM_SLACK_PX);
    }, [releases]);

    if (!releases || !version) return null;

    const close = () => {
        // Always the running version, never `notes[0].version` — they differ
        // whenever the current release earned no card, and storing the array's
        // newest would leave a mark below where the reader actually is, so
        // already-dismissed cards would return on the next open.
        writeLastSeen(version);
        setReleases(null);
    };

    const handleScroll = () => {
        const element = scrollRef.current;
        if (!element) return;
        if (element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_SLACK_PX) {
            setAtBottom(true);
        }
    };

    /**
     * One button doing two jobs, terms-and-conditions style: while there is
     * list below the fold it scrolls, and once the bottom has been reached —
     * by that tap *or* by the reader swiping there, which is why the scroll
     * listener sets the same flag — it dismisses.
     */
    const handleAction = () => {
        if (atBottom) return close();
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    };

    return (
        /* Below `InactivityRefreshPopup`'s z-50 on purpose. If a newer build is
           served while this is open, that sheet is the more urgent of the two —
           it is about the page being stale right now, where this is about a
           version already delivered. */
        <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
            <div className="relative shrink-0 px-5 pt-6 pb-4">
                <div aria-hidden className="pointer-events-none absolute inset-0" style={DOT_GRID} />
                {/* The gate below is the intended path, but it runs entirely on
                    one measurement. If that measurement is ever wrong on some
                    device, this overlay covers a till with no way out but
                    clearing site data. This is the unconditional exit. */}
                <button
                    onClick={close}
                    aria-label={copy.close}
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-500 active:scale-95 transition-transform"
                >
                    <X size={18} />
                </button>
                <div className="relative flex flex-col items-center gap-1">
                    <Icon icon="fluent-emoji:sparkles" width={64} height={64} />
                    <p className="text-xl font-bold text-gray-900">{copy.title}</p>
                    <p className="text-sm text-gray-500">v{version}</p>
                </div>
            </div>

            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-4">
                {/* No `currentVersion`: every card here is a version the reader
                    is on, and the header already states which. */}
                <PatchNotes notes={releases} />
            </div>

            <div className="shrink-0 border-t border-gray-200 bg-white p-4 pb-8">
                <button
                    onClick={handleAction}
                    className="w-full rounded-xl bg-brand py-4 text-base font-semibold text-white active:scale-[0.98] transition-transform"
                >
                    {atBottom ? copy.gotIt : copy.scrollToContinue}
                </button>
            </div>
        </div>
    );
}
