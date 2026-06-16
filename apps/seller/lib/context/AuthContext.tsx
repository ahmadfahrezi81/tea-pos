"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import { User } from "@tea-pos/features/users/schema";
import { usersApi } from "@/lib/api/users";
import type { Locale } from "@tea-pos/utils/translations";

const supabase = createClient();

const fetchAvatarUrl = async (): Promise<string | null> => {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return user?.user_metadata?.avatar_url ?? null;
};

interface AuthContextType {
    user: User | null;
    avatarUrl: string | null;
    isLoading: boolean;
    mutate: () => Promise<User | null | undefined>;
    signOut: () => Promise<void>;
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
        preferredLanguage?: string;
    } | null;
}) {
    const fallbackData: User | undefined = initialUser
        ? {
              id: initialUser.id,
              role: initialUser.role,
              email: initialUser.email ?? "",
              fullName: initialUser.fullName ?? "",
              phoneNumber: null,
              status: "active",
              createdAt: null,
              updatedAt: null,
              preferredLanguage: (initialUser.preferredLanguage ?? "en") as Locale,
          }
        : undefined;

    const {
        data: user = null,
        isLoading,
        mutate,
    } = useSWR(
        "user",
        initialUser ? usersApi.get : null,
        {
            fallbackData,
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

    const signOut = async () => {
        await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    };

    return (
        <AuthContext.Provider value={{ user, avatarUrl, isLoading, mutate, signOut }}>
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
