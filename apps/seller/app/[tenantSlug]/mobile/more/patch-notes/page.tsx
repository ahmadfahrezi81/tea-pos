import { PatchNotes } from "@tea-pos/ui/custom/PatchNotes";
import { patchNotes } from "@/lib/patch-notes";

export default function PatchNotesPage() {
    return (
        <PatchNotes
            notes={patchNotes}
            currentVersion={process.env.NEXT_PUBLIC_APP_VERSION}
            /* The list starts at 5.0.2, so it says so rather than reading as if
               the app began there. */
            footer="Earlier versions aren't listed."
        />
    );
}
