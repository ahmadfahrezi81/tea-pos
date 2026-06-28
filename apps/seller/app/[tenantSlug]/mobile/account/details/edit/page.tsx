"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/user/useCurrentUser";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import type { User, UpdateUserInput } from "@tea-pos/features/users/schema";
import { useT } from "@/lib/hooks/useT";

function stripPhonePrefix(phone: string | null): number {
    if (!phone) return 0;
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("62")) return parseInt(digits.slice(2)) || 0;
    if (digits.startsWith("0")) return parseInt(digits.slice(1)) || 0;
    return parseInt(digits) || 0;
}

function splitFullName(fullName: string) {
    const parts = fullName?.trim().split(" ") ?? [];
    return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function EditForm({ user, update }: { user: User; update: (input: UpdateUserInput) => Promise<User> }) {
    const router = useRouter();
    const t = useT();
    const { firstName: initFirst, lastName: initLast } = splitFullName(user.fullName);
    const [firstName, setFirstName] = useState(initFirst);
    const [lastName, setLastName] = useState(initLast);
    const [phoneDigits, setPhoneDigits] = useState(stripPhonePrefix(user.phoneNumber));

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
            await update({
                fullName: fullName || undefined,
                phoneNumber: phoneDigits ? `+62${phoneDigits}` : null,
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("account.failedToSave"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">{t("account.firstName")}</p>
                    <TextInput value={firstName} onChange={setFirstName} placeholder={t("account.firstNamePlaceholder")} />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">{t("account.lastName")}</p>
                    <TextInput value={lastName} onChange={setLastName} placeholder={t("account.lastNamePlaceholder")} />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">{t("account.phoneNumber")}</p>
                    <NumberInput
                        prefix="+62"
                        raw
                        value={phoneDigits}
                        onChange={setPhoneDigits}
                        placeholder="812 345 6789"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40 text-base"
            >
                {isSaving ? t("account.saving") : t("common.save")}
            </button>
        </div>
    );
}

export default function EditPersonalDetailsPage() {
    const { user, isLoading, update } = useCurrentUser();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return <EditForm key={user.id} user={user} update={update} />;
}
