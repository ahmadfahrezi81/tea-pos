// app/mobile/profile/page.tsx
"use client";
import { useProfile } from "@/lib/hooks/useData";
import MobileAuth from "@/components/mobile/MobileAuth";

export default function ProfilePage() {
    const { data: profile, mutate } = useProfile();

    return <MobileAuth profile={profile} mutate={mutate} />;
}
