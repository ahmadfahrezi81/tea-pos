"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import { User, UserResponse } from "@tea-pos/features/users/schema";
import { toCamelKeys } from "@tea-pos/utils/schemas";

const supabase = createClient();

const fetchUser = async (): Promise<User | null> => {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();
        if (error || !user) return null;

        const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!data) return null;

        return UserResponse.parse(toCamelKeys(data));
    } catch (error) {
        console.error("fetchUser error:", error);
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
    user: User | null;
    avatarUrl: string | null;
    isLoading: boolean;
    mutate: () => Promise<User | null | undefined>;
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
    const fallbackData: User | null = initialUser
        ? {
              id: initialUser.id,
              role: initialUser.role,
              email: initialUser.email ?? "",
              fullName: initialUser.fullName ?? "",
              phoneNumber: null,
              status: "active",
              createdAt: null,
              updatedAt: null,
              preferredLanguage: "en" as const,
          }
        : null;

    const {
        data: user = null,
        isLoading,
        mutate,
    } = useSWR(
        "user",
        // Don't fetch if no session exists server-side
        initialUser ? fetchUser : null,
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
        <AuthContext.Provider value={{ user, avatarUrl, isLoading, mutate }}>
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
