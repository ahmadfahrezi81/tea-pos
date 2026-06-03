"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import { User, UserResponse } from "@tea-pos/features/users/schema";
// UserResponse used in fetchUser below
import { toCamelKeys } from "@tea-pos/utils/schemas";

const supabase = createClient();

const fetchUser = async (): Promise<User | null> => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
        if (!data) return null;
        return UserResponse.parse(toCamelKeys(data));
    } catch {
        return null;
    }
};

const fetchAvatarUrl = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
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
    initialUser?: unknown;
}) {
    void initialUser;
    const { data: user, isLoading, mutate } = useSWR<User | null>(
        "auth-user",
        fetchUser,
        { fallbackData: null, revalidateOnFocus: false, dedupingInterval: 30_000 },
    );

    const { data: avatarUrl } = useSWR<string | null>(
        "auth-avatar",
        fetchAvatarUrl,
        { fallbackData: null, revalidateOnFocus: false, dedupingInterval: 60_000 },
    );

    return (
        <AuthContext.Provider value={{ user: user ?? null, avatarUrl: avatarUrl ?? null, isLoading, mutate }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
