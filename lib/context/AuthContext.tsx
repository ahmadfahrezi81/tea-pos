// // lib/context/AuthContext.tsx

// "use client";
// import { createContext, useContext, useEffect } from "react";
// import useSWR from "swr";
// import { createClient } from "@/lib/supabase/client";
// import { Profile, ProfileResponse } from "@/lib/schemas/profiles";
// import { toCamelKeys } from "@/lib/utils/schemas";

// const supabase = createClient();

// // Helper to read user cookie
// // function getUserFromCookie(): { id: string; role: string } | null {
// //     if (typeof window === "undefined") return null;
// //     const cookieValue = document.cookie
// //         .split("; ")
// //         .find((row) => row.startsWith("x-user-info="))
// //         ?.split("=")[1];
// //     if (!cookieValue) return null;
// //     try {
// //         return JSON.parse(decodeURIComponent(cookieValue));
// //     } catch {
// //         return null;
// //     }
// // }

// // const fetchProfile = async (): Promise<Profile | null> => {
// //     const {
// //         data: { user },
// //     } = await supabase.auth.getUser();
// //     if (!user) return null;

// //     const { data } = await supabase
// //         .from("profiles")
// //         .select("*")
// //         .eq("id", user.id)
// //         .single();

// //     if (!data) return null;

// //     // Convert snake_case from DB to camelCase and validate with Zod
// //     const camelCaseData = toCamelKeys(data);
// //     return ProfileResponse.parse(camelCaseData);
// // };

// // const fetchProfile = async (): Promise<Profile | null> => {
// //     try {
// //         const {
// //             data: { user },
// //             error: userError,
// //         } = await supabase.auth.getUser();

// //         if (userError) {
// //             console.error("Auth error:", userError);
// //             return null;
// //         }

// //         if (!user) return null;

// //         const { data, error: profileError } = await supabase
// //             .from("profiles")
// //             .select("*")
// //             .eq("id", user.id)
// //             .single();

// //         if (profileError) {
// //             console.error("Profile fetch error:", profileError);
// //             return null;
// //         }

// //         if (!data) return null;

// //         // Convert snake_case from DB to camelCase and validate with Zod
// //         const camelCaseData = toCamelKeys(data);
// //         return ProfileResponse.parse(camelCaseData);
// //     } catch (error) {
// //         console.error("Unexpected error in fetchProfile:", error);
// //         return null;
// //     }
// // };

// const fetchProfile = async (): Promise<Profile | null> => {
//     try {
//         // First, check if we have an active session
//         const {
//             data: { session },
//             error: sessionError,
//         } = await supabase.auth.getSession();

//         if (sessionError) {
//             console.warn("Session error:", sessionError);
//             return null;
//         }

//         if (!session) {
//             console.warn("No active session found");
//             return null;
//         }

//         // Now get the user with the valid session
//         const {
//             data: { user },
//             error: userError,
//         } = await supabase.auth.getUser();

//         if (userError) {
//             console.error("Auth error:", userError);
//             return null;
//         }

//         if (!user) {
//             console.warn("No user found despite having session");
//             return null;
//         }

//         const { data, error: profileError } = await supabase
//             .from("profiles")
//             .select("*")
//             .eq("id", user.id)
//             .single();

//         if (profileError) {
//             console.error("Profile fetch error:", profileError);
//             return null;
//         }

//         if (!data) return null;

//         // Convert snake_case from DB to camelCase and validate with Zod
//         const camelCaseData = toCamelKeys(data);
//         return ProfileResponse.parse(camelCaseData);
//     } catch (error) {
//         console.error("Unexpected error in fetchProfile:", error);
//         return null;
//     }
// };

// interface AuthContextType {
//     profile: Profile | null;
//     isLoading: boolean;
//     mutate: () => Promise<Profile | null | undefined>;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// // export function AuthProvider({ children }: { children: React.ReactNode }) {
// //     // Read cookie IMMEDIATELY, not in useEffect
// //     const userFromCookie =
// //         typeof window !== "undefined" ? getUserFromCookie() : null;

// //     // Create initial profile synchronously
// //     const initialProfile: Profile | null = userFromCookie
// //         ? {
// //               id: userFromCookie.id,
// //               role: userFromCookie.role,
// //               email: "",
// //               fullName: "",
// //               createdAt: null,
// //               updatedAt: null,
// //           }
// //         : null;

// //     // const {
// //     //     data: profile,
// //     //     isLoading,
// //     //     mutate,
// //     // } = useSWR<Profile | null>("profile", fetchProfile, {
// //     //     fallbackData: initialProfile,
// //     //     revalidateOnMount: true,
// //     // });

// //     const {
// //         data: profile = null,
// //         isLoading,
// //         mutate,
// //     } = useSWR<Profile | null>("profile", fetchProfile, {
// //         fallbackData: initialProfile,
// //         revalidateOnMount: true,
// //     });

// //     return (
// //         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
// //             {children}
// //         </AuthContext.Provider>
// //     );
// // }

// // export function AuthProvider({
// //     children,
// //     initialUser,
// // }: {
// //     children: React.ReactNode;
// //     initialUser?: { id: string; role: string } | null;
// // }) {
// //     const initialProfile = initialUser
// //         ? {
// //               id: initialUser.id,
// //               role: initialUser.role,
// //               email: "",
// //               fullName: "",
// //               createdAt: null,
// //               updatedAt: null,
// //           }
// //         : null;

// //     const {
// //         data: profile,
// //         isLoading,
// //         mutate,
// //     } = useSWR(initialUser ? "profile" : null, fetchProfile, {
// //         fallbackData: initialProfile,
// //         revalidateOnMount: true,
// //     });

// //     if (isLoading && !profile) return <div>Loading...</div>;

// //     return (
// //         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
// //             {children}
// //         </AuthContext.Provider>
// //     );
// // }

// export function AuthProvider({
//     children,
//     initialUser,
// }: {
//     children: React.ReactNode;
//     initialUser?: { id: string; role: string } | null;
// }) {
//     const {
//         data: profile = null,
//         isLoading,
//         error,
//         mutate,
//     } = useSWR(
//         // Always use the same key, but conditionally fetch
//         "profile",
//         async () => {
//             // If no initialUser, don't try to fetch
//             if (!initialUser) return null;
//             return fetchProfile();
//         },
//         {
//             fallbackData:
//                 initialUser != null
//                     ? {
//                           id: initialUser.id,
//                           role: initialUser.role,
//                           email: "",
//                           fullName: "",
//                           phoneNumber: null,
//                           status: "active",
//                           createdAt: null,
//                           updatedAt: null,
//                       }
//                     : null,

//             revalidateOnMount: true,
//             shouldRetryOnError: true,
//             errorRetryCount: 3,
//         }
//     );

//     // Add error logging
//     useEffect(() => {
//         if (error) {
//             console.error("AuthProvider error:", error);
//         }
//     }, [error]);

//     return (
//         <AuthContext.Provider value={{ profile, isLoading, mutate }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// export function useAuth(): AuthContextType {
//     const context = useContext(AuthContext);
//     if (!context) {
//         throw new Error("useAuth must be used within an AuthProvider");
//     }
//     return context;
// }

"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Profile, ProfileResponse } from "@/lib/schemas/profiles";
import { toCamelKeys } from "@/lib/utils/schemas";

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

interface AuthContextType {
    profile: Profile | null;
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
