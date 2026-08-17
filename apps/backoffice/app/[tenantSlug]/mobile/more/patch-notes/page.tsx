import { PatchNotes } from "@tea-pos/ui/custom/PatchNotes";
import { patchNotes } from "@/lib/patch-notes";

export default function PatchNotesPage() {
    return (
        <PatchNotes
            notes={patchNotes}
            currentVersion={process.env.NEXT_PUBLIC_APP_VERSION}
        />
    );
}
