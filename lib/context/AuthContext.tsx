// lib/context/AuthContext.tsx
"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const fetchProfile = async () => {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    return data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const {
        data: profile,
        isLoading,
        mutate,
    } = useSWR("profile", fetchProfile);

    return (
        <AuthContext.Provider value={{ profile, isLoading, mutate }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
