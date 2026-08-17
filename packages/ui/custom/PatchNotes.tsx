import type { ReactNode } from "react";

/**
 * Release notes for one version of one app.
 *
 * The data is a typed array in each app rather than rows in a table: notes
 * describe a build, they are written in the commit that bumps the version, and
 * they ship with it. A table would let a deployment show notes for a build it
 * is not running, and could not be reviewed alongside the diff it describes.
 */
export type PatchNoteKind = "added" | "improved" | "fixed";

export interface PatchNoteEntry {
    kind: PatchNoteKind;
    /** One short line. See the patch-notes skill for the voice. */
    text: string;
}

export interface PatchNote {
    /** Exactly the string in that app's package.json. */
    version: string;
    /** yyyy-mm-dd, the day it shipped. */
    date: string;
    entries: PatchNoteEntry[];
}

/* Three words a reader can sort by at a glance. "Changed" is not among them —
   it tells you a thing is different without telling you whether that is good
   news, which is the only question being asked. */
const KIND_LABEL: Record<PatchNoteKind, string> = {
    added: "NEW",
    improved: "BETTER",
    fixed: "FIXED",
};

const KIND_STYLE: Record<PatchNoteKind, string> = {
    added: "bg-green-100 text-green-700",
    improved: "bg-blue-100 text-blue-700",
    fixed: "bg-amber-100 text-amber-700",
};

function formatDate(date: string): string {
    // Midday UTC, so the offset cannot push the label onto the previous day.
    return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * Newest release first, one card each.
 *
 * The reader almost certainly did not come here to read. They came to check
 * whether the thing that annoyed them last week is fixed, and the layout is
 * built for finding that line in about four seconds: a fixed tag column so the
 * eye can run down one edge, and one line of text per entry.
 */
export function PatchNotes({
    notes,
    currentVersion,
    footer,
}: {
    notes: PatchNote[];
    /** Marks the release the reader is running. */
    currentVersion?: string;
    /** For a list that starts partway through the app's history. */
    footer?: ReactNode;
}) {
    if (notes.length === 0) return null;

    return (
        <div className="space-y-3">
            {notes.map((note) => (
                <div key={note.version} className="bg-white rounded-2xl p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                        <div>
                            <p className="text-lg font-bold text-gray-900">{note.version}</p>
                            <p className="text-sm text-gray-500">{formatDate(note.date)}</p>
                        </div>
                        {note.version === currentVersion && (
                            <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                                You&apos;re on this
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3">
                        {note.entries.map((entry, i) => (
                            <div key={i} className="flex gap-2.5">
                                {/* Fixed width, so the tags form a column and the
                                    sentences all start at the same place. */}
                                <span
                                    className={`shrink-0 w-14 rounded-md py-0.5 text-center text-[11px] font-bold tracking-wide ${KIND_STYLE[entry.kind]}`}
                                >
                                    {KIND_LABEL[entry.kind]}
                                </span>
                                <p className="text-sm text-gray-800">{entry.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {footer && <p className="px-1 pb-2 text-center text-xs text-gray-400">{footer}</p>}
        </div>
    );
}
