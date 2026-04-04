"use client";

interface NotesStepProps {
    notes: string;
    onNotesChange: (notes: string) => void;
}

const QUICK_NOTES = [
    "All good today 👍",
    "Short staffed today",
    "Equipment issue",
    "High traffic day",
    "Slow day",
    "Cash shortage",
];

export function NotesStep({ notes, onNotesChange }: NotesStepProps) {
    const handleQuickNote = (note: string) => {
        if (notes.includes(note)) return;
        onNotesChange(notes ? `${notes}\n${note}` : note);
    };

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">
                    Any Notes?
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Optional — add anything worth noting about today.
                </p>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                    Quick Add
                </p>
                <div className="flex flex-wrap gap-2">
                    {QUICK_NOTES.map((note) => (
                        <button
                            key={note}
                            onClick={() => handleQuickNote(note)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 ${
                                notes.includes(note)
                                    ? "bg-brand text-white"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {note}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                    Notes
                </p>
                <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Write anything about today's shift..."
                    maxLength={1000}
                    className="w-full p-4 border border-gray-200 rounded-2xl text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-200 resize-none bg-gray-50 h-36"
                />
                <p className="text-xs text-gray-400 text-right">
                    {notes.length} / 1000
                </p>
            </div>

            <div className="h-4" />
        </div>
    );
}
