"use client";

import WhatsNew from "@tea-pos/shell/WhatsNew";
import { patchNotes } from "@/lib/patch-notes";
import { useT } from "@/lib/hooks/useT";

/**
 * The shell's `WhatsNew` takes its copy as props — the backoffice has no i18n
 * layer, so the package cannot reach for `useT` itself. This is the seller
 * half: a client component purely to translate, since the layout that mounts it
 * is a server component.
 *
 * The note text itself stays English in both apps (task 050). Only the chrome
 * around it is translated.
 */
export default function WhatsNewMount() {
    const t = useT();

    return (
        <WhatsNew
            notes={patchNotes}
            version={process.env.NEXT_PUBLIC_APP_VERSION}
            copy={{
                title: t("whatsNew.title"),
                scrollToContinue: t("whatsNew.scrollToContinue"),
                gotIt: t("whatsNew.gotIt"),
                close: t("whatsNew.close"),
            }}
        />
    );
}
