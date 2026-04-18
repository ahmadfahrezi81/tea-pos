"use client";
import { createContext, useContext, useState, useEffect } from "react";
import {
    getIconById,
    getStoredIconId,
    PROFILE_ICON_KEY,
} from "@/app/[tenantSlug]/mobile/profile/_components/IconPickerDrawer";
import type { LucideIcon } from "lucide-react";

type ProfileIconContextType = {
    iconId: string;
    setIconId: (id: string) => void;
    ProfileIcon: LucideIcon;
};

const ProfileIconContext = createContext<ProfileIconContextType | null>(null);

export function ProfileIconProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [iconId, setIconIdRaw] = useState<string>(() => {
        if (typeof window === "undefined") return "bird";
        return getStoredIconId();
    });

    // Hydrate from localStorage on mount (SSR safety)
    useEffect(() => {
        setIconIdRaw(getStoredIconId());
    }, []);

    const setIconId = (id: string) => {
        localStorage.setItem(PROFILE_ICON_KEY, id);
        setIconIdRaw(id);
    };

    const ProfileIcon = getIconById(iconId);

    return (
        <ProfileIconContext.Provider value={{ iconId, setIconId, ProfileIcon }}>
            {children}
        </ProfileIconContext.Provider>
    );
}

export function useProfileIcon(): ProfileIconContextType {
    const context = useContext(ProfileIconContext);
    if (!context) {
        throw new Error(
            "useProfileIcon must be used within a ProfileIconProvider",
        );
    }
    return context;
}
