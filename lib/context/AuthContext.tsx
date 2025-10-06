// // // // lib/context/AuthContext.tsx
// // // "use client";
// // // import { createContext, useContext } from "react";
// // // import useSWR from "swr";
// // // import { createClient } from "@/lib/supabase/client";

// // // const supabase = createClient();

// // // const fetchProfile = async () => {
// // //     const {
// // //         data: { user },
// // //     } = await supabase.auth.getUser();
// // //     if (!user) return null;
// // //     const { data } = await supabase
// // //         .from("profiles")
// // //         .select("*")
// // //         .eq("id", user.id)
// // //         .single();
// // //     return data;
// // // };

// // // // eslint-disable-next-line @typescript-eslint/no-explicit-any
// // // const AuthContext = createContext<any>(null);

// // // export function AuthProvider({ children }: { children: React.ReactNode }) {
// // //     const {
// // //         data: profile,
// // //         isLoading,
// // //         mutate,
// // //     } = useSWR("profile", fetchProfile);

// // //     return (
// // //         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
// // //             {children}
// // //         </AuthContext.Provider>
// // //     );
// // // }

// // // export function useAuth() {
// // //     return useContext(AuthContext);
// // // }

// // // lib/context/AuthContext.tsx
// // "use client";
// // import { createContext, useContext } from "react";
// // import useSWR from "swr";
// // import { createClient } from "@/lib/supabase/client";
// // import { Tables } from "@/lib/db.types";

// // const supabase = createClient();

// // const fetchProfile = async () => {
// //     const {
// //         data: { user },
// //     } = await supabase.auth.getUser();
// //     if (!user) return null;
// //     const { data } = await supabase
// //         .from("profiles")
// //         .select("*")
// //         .eq("id", user.id)
// //         .single();
// //     return data;
// // };

// // const AuthContext = createContext<any>(null);

// // export function AuthProvider({
// //     children,
// //     initialProfile = null,
// // }: {
// //     children: React.ReactNode;
// //     initialProfile?: Tables<"profiles"> | null;
// // }) {
// //     const {
// //         data: profile,
// //         isLoading,
// //         mutate,
// //     } = useSWR("profile", fetchProfile, {
// //         fallbackData: initialProfile, // Use server data as initial state
// //         revalidateOnMount: !initialProfile, // Only revalidate if no initial data
// //     });

// //     console.log("AuthProvider initialized with:", initialProfile);

// //     return (
// //         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
// //             {children}
// //         </AuthContext.Provider>
// //     );
// // }

// // export function useAuth() {
// //     return useContext(AuthContext);
// // }

// // // Add this wrapper component for the tenant layout
// // export function AuthProviderWithInitialData({
// //     children,
// //     initialProfile,
// // }: {
// //     children: React.ReactNode;
// //     initialProfile: Tables<"profiles"> | null;
// // }) {
// //     return (
// //         <AuthProvider initialProfile={initialProfile}>{children}</AuthProvider>
// //     );
// // }

// //lib/context/AuthContext.tsx
// "use client";
// import { createContext, useContext, useEffect, useState } from "react";
// import useSWR from "swr";
// import { createClient } from "@/lib/supabase/client";
// import { Tables } from "@/lib/db.types";

// const supabase = createClient();

// // Helper to read user cookie
// function getUserFromCookie(): { id: string; role: string } | null {
//     if (typeof window === "undefined") return null;

//     const cookieValue = document.cookie
//         .split("; ")
//         .find((row) => row.startsWith("x-user-info="))
//         ?.split("=")[1];

//     if (!cookieValue) return null;

//     try {
//         return JSON.parse(decodeURIComponent(cookieValue));
//     } catch {
//         return null;
//     }
// }

// const fetchProfile = async () => {
//     const {
//         data: { user },
//     } = await supabase.auth.getUser();
//     if (!user) return null;
//     const { data } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", user.id)
//         .single();
//     return data;
// };

// const AuthContext = createContext<any>(null);

// // export function AuthProvider({ children }: { children: React.ReactNode }) {
// //     // Read initial state from cookie
// //     const userFromCookie = getUserFromCookie();
// //     const [initialProfile, setInitialProfile] =
// //         useState<Tables<"profiles"> | null>(null);

// //     useEffect(() => {
// //         // On mount, create a minimal profile from cookie
// //         if (userFromCookie) {
// //             setInitialProfile({
// //                 id: userFromCookie.id,
// //                 role: userFromCookie.role,
// //                 email: "", // Will be filled by SWR
// //                 full_name: "", // Will be filled by SWR
// //                 created_at: null,
// //                 updated_at: null,
// //             } as Tables<"profiles">);
// //         }
// //     }, []);

// //     const {
// //         data: profile,
// //         isLoading,
// //         mutate,
// //     } = useSWR("profile", fetchProfile, {
// //         fallbackData: initialProfile,
// //         revalidateOnMount: true, // Always fetch fresh data
// //     });

// //     return (
// //         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
// //             {children}
// //         </AuthContext.Provider>
// //     );
// // }

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//     // Read cookie IMMEDIATELY, not in useEffect
//     const userFromCookie =
//         typeof window !== "undefined" ? getUserFromCookie() : null;

//     // Create initial profile synchronously
//     const initialProfile = userFromCookie
//         ? ({
//               id: userFromCookie.id,
//               role: userFromCookie.role,
//               email: "",
//               full_name: "",
//               created_at: null,
//               updated_at: null,
//           } as Tables<"profiles">)
//         : null;

//     const {
//         data: profile,
//         isLoading,
//         mutate,
//     } = useSWR("profile", fetchProfile, {
//         fallbackData: initialProfile, // Use it immediately
//         revalidateOnMount: true,
//     });

//     return (
//         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// export function useAuth() {
//     return useContext(AuthContext);
// }

"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Profile, ProfileResponse } from "@/lib/schemas/profiles";
import { toCamelKeys } from "@/lib/utils/schemas";

const supabase = createClient();

// Helper to read user cookie
// function getUserFromCookie(): { id: string; role: string } | null {
//     if (typeof window === "undefined") return null;
//     const cookieValue = document.cookie
//         .split("; ")
//         .find((row) => row.startsWith("x-user-info="))
//         ?.split("=")[1];
//     if (!cookieValue) return null;
//     try {
//         return JSON.parse(decodeURIComponent(cookieValue));
//     } catch {
//         return null;
//     }
// }

const fetchProfile = async (): Promise<Profile | null> => {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!data) return null;

    // Convert snake_case from DB to camelCase and validate with Zod
    const camelCaseData = toCamelKeys(data);
    return ProfileResponse.parse(camelCaseData);
};

interface AuthContextType {
    profile: Profile | null;
    isLoading: boolean;
    mutate: () => Promise<Profile | null | undefined>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//     // Read cookie IMMEDIATELY, not in useEffect
//     const userFromCookie =
//         typeof window !== "undefined" ? getUserFromCookie() : null;

//     // Create initial profile synchronously
//     const initialProfile: Profile | null = userFromCookie
//         ? {
//               id: userFromCookie.id,
//               role: userFromCookie.role,
//               email: "",
//               fullName: "",
//               createdAt: null,
//               updatedAt: null,
//           }
//         : null;

//     // const {
//     //     data: profile,
//     //     isLoading,
//     //     mutate,
//     // } = useSWR<Profile | null>("profile", fetchProfile, {
//     //     fallbackData: initialProfile,
//     //     revalidateOnMount: true,
//     // });

//     const {
//         data: profile = null,
//         isLoading,
//         mutate,
//     } = useSWR<Profile | null>("profile", fetchProfile, {
//         fallbackData: initialProfile,
//         revalidateOnMount: true,
//     });

//     return (
//         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

export function AuthProvider({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser?: { id: string; role: string } | null;
}) {
    const initialProfile = initialUser
        ? {
              id: initialUser.id,
              role: initialUser.role,
              email: "",
              fullName: "",
              createdAt: null,
              updatedAt: null,
          }
        : null;

    const {
        data: profile,
        isLoading,
        mutate,
    } = useSWR(initialUser ? "profile" : null, fetchProfile, {
        fallbackData: initialProfile,
        revalidateOnMount: true,
    });

    if (isLoading && !profile) return <div>Loading...</div>;

    return (
        <AuthContext.Provider value={{ profile, isLoading, mutate }}>
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
