"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/user/useCurrentUser";
import { usersApi } from "@/lib/api/users";
import type { User } from "@tea-pos/features/users/schema";

function splitFullName(fullName: string) {
    const parts = fullName?.trim().split(" ") ?? [];
    return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function EditForm({ user, mutate }: { user: User; mutate: () => void }) {
    const router = useRouter();
    const { firstName: initFirst, lastName: initLast } = splitFullName(user.fullName);
    const [firstName, setFirstName] = useState(initFirst);
    const [lastName, setLastName] = useState(initLast);
    const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
            await usersApi.update({
                fullName: fullName || undefined,
                phoneNumber: phoneNumber.trim() || null,
            });
            mutate();
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">First Name</p>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Last Name</p>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Phone Number</p>
                    <input
                        type="tel"
                        inputMode="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. +62 812 3456 7890"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40 text-base"
            >
                {isSaving ? "Saving..." : "Save"}
            </button>
        </div>
    );
}

export default function EditPersonalDetailsPage() {
    const { user, isLoading, mutate } = useCurrentUser();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return <EditForm key={user.id} user={user} mutate={mutate} />;
}
