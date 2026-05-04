"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import { Profile, ProfileResponse } from "@tea-pos/features/profiles/schema";
import { toCamelKeys } from "@tea-pos/utils/schemas";

const supabase = createClient();

const fetchProfile = async (): Promise<Profile | null> => {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();
        if (error || !user) return null;

        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!data) return null;

        return ProfileResponse.parse(toCamelKeys(data));
    } catch (error) {
        console.error("fetchProfile error:", error);
        return null;
    }
};

const fetchAvatarUrl = async (): Promise<string | null> => {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return user?.user_metadata?.avatar_url ?? null;
};

interface AuthContextType {
    profile: Profile | null;
    avatarUrl: string | null;
    isLoading: boolean;
    mutate: () => Promise<Profile | null | undefined>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser?: {
        id: string;
        role: string;
        email?: string;
        fullName?: string;
        avatarUrl?: string;
    } | null;
}) {
    const fallbackData: Profile | null = initialUser
        ? {
              id: initialUser.id,
              role: initialUser.role,
              email: initialUser.email ?? "",
              fullName: initialUser.fullName ?? "",
              phoneNumber: null,
              status: "active",
              createdAt: null,
              updatedAt: null,
          }
        : null;

    const {
        data: profile = null,
        isLoading,
        mutate,
    } = useSWR(
        "profile",
        // Don't fetch if no session exists server-side
        initialUser ? fetchProfile : null,
        {
            fallbackData,
            // Server already validated the session — skip revalidation on mount,
            // SWR will still revalidate on next focus or manual mutate()
            revalidateOnMount: !initialUser,
            revalidateOnFocus: false,
            shouldRetryOnError: true,
            errorRetryCount: 3,
        },
    );

    const { data: avatarUrl = null } = useSWR(
        initialUser ? "avatarUrl" : null,
        fetchAvatarUrl,
        {
            fallbackData: initialUser?.avatarUrl ?? null,
            revalidateOnMount: !initialUser?.avatarUrl,
        },
    );

    return (
        <AuthContext.Provider value={{ profile, avatarUrl, isLoading, mutate }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
