// app/[tenantSlug]/mobile/analytics/daily/_components/NotesStep.tsx
"use client";

import { FileText } from "lucide-react";

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
        const updated = notes ? `${notes}\n${note}` : note;
        onNotesChange(updated);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">
                    Any Notes?
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Optional — add anything worth noting about today.
                </p>
            </div>

            {/* Quick notes */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Quick Add
                </p>
                <div className="flex flex-wrap gap-2">
                    {QUICK_NOTES.map((note) => {
                        const isSelected = notes.includes(note);
                        return (
                            <button
                                key={note}
                                onClick={() => handleQuickNote(note)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 ${
                                    isSelected
                                        ? "bg-brand text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {note}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Text area */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Notes
                </p>
                <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Write anything about today's shift..."
                    className="w-full p-4 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 resize-none bg-gray-50 h-36"
                />
                <p className="text-xs text-gray-400 text-right">
                    {notes.length} / 1000
                </p>
            </div>

            {/* Empty state */}
            {notes.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-400">
                        {`No notes added — that's fine, you can skip this step.`}
                    </p>
                </div>
            )}

            <div className="h-4" />
        </div>
    );
}
