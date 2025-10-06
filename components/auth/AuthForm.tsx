// // "use client";
// // import { useState } from "react";
// // import { createClient } from "@/lib/supabase/client";
// // import { useRouter } from "next/navigation";

// // interface AuthFormProps {
// //     mode: "login" | "signup";
// // }

// // export default function AuthForm({ mode }: AuthFormProps) {
// //     const [email, setEmail] = useState("");
// //     const [password, setPassword] = useState("");
// //     const [fullName, setFullName] = useState("");
// //     const [role, setRole] = useState<"seller" | "manager">("seller");
// //     const [loading, setLoading] = useState(false);
// //     const [error, setError] = useState("");
// //     const router = useRouter();
// //     const supabase = createClient();

// //     const handleSubmit = async (e: React.FormEvent) => {
// //         e.preventDefault();
// //         setLoading(true);
// //         setError("");

// //         try {
// //             if (mode === "signup") {
// //                 const { data, error } = await supabase.auth.signUp({
// //                     email,
// //                     password,
// //                 });

// //                 if (error) throw error;

// //                 if (data.user) {
// //                     // Create profile
// //                     const { error: profileError } = await supabase
// //                         .from("profiles")
// //                         .insert({
// //                             id: data.user.id,
// //                             email,
// //                             full_name: fullName,
// //                             role,
// //                         });

// //                     if (profileError) throw profileError;

// //                     alert("Check your email for verification link!");
// //                 }
// //             } else {
// //                 const { error } = await supabase.auth.signInWithPassword({
// //                     email,
// //                     password,
// //                 });

// //                 if (error) throw error;
// //                 router.push("/admin/dashboard");
// //             }
// //             // eslint-disable-next-line @typescript-eslint/no-explicit-any
// //         } catch (error: any) {
// //             setError(error.message);
// //         } finally {
// //             setLoading(false);
// //         }
// //     };

// //     return (
// //         <form onSubmit={handleSubmit} className="space-y-6">
// //             {error && (
// //                 <div className="bg-red-100 text-red-700 p-3 rounded">
// //                     {error}
// //                 </div>
// //             )}

// //             {mode === "signup" && (
// //                 <div>
// //                     <label className="block text-sm font-medium mb-1">
// //                         Full Name
// //                     </label>
// //                     <input
// //                         type="text"
// //                         value={fullName}
// //                         onChange={(e) => setFullName(e.target.value)}
// //                         className="w-full p-3 border rounded-lg"
// //                         required
// //                     />
// //                 </div>
// //             )}

// //             <div>
// //                 <label className="block text-sm font-medium mb-1">Email</label>
// //                 <input
// //                     type="email"
// //                     value={email}
// //                     onChange={(e) => setEmail(e.target.value)}
// //                     className="w-full p-3 border rounded-lg"
// //                     required
// //                 />
// //             </div>

// //             <div>
// //                 <label className="block text-sm font-medium mb-1">
// //                     Password
// //                 </label>
// //                 <input
// //                     type="password"
// //                     value={password}
// //                     onChange={(e) => setPassword(e.target.value)}
// //                     className="w-full p-3 border rounded-lg"
// //                     required
// //                 />
// //             </div>

// //             {mode === "signup" && (
// //                 <div>
// //                     <label className="block text-sm font-medium mb-1">
// //                         Role
// //                     </label>
// //                     <select
// //                         value={role}
// //                         onChange={(e) =>
// //                             setRole(e.target.value as "seller" | "manager")
// //                         }
// //                         className="w-full p-3 border rounded-lg"
// //                     >
// //                         <option value="seller">Seller</option>
// //                         <option value="manager">Manager</option>
// //                     </select>
// //                 </div>
// //             )}

// //             <button
// //                 type="submit"
// //                 disabled={loading}
// //                 className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
// //             >
// //                 {loading
// //                     ? "Loading..."
// //                     : mode === "login"
// //                     ? "Sign In"
// //                     : "Sign Up"}
// //             </button>
// //         </form>
// //     );
// // }

// // "use client";
// // import { useState } from "react";
// // import { createClient } from "@/lib/supabase/client";
// // import { useRouter } from "next/navigation";

// // interface AuthFormProps {
// //     mode: "login" | "signup";
// // }

// // export default function AuthForm({ mode }: AuthFormProps) {
// //     const [email, setEmail] = useState("");
// //     const [password, setPassword] = useState("");
// //     const [fullName, setFullName] = useState("");
// //     const [role, setRole] = useState<"SELLER" | "ADMIN">("SELLER");
// //     const [loading, setLoading] = useState(false);
// //     const [error, setError] = useState("");

// //     const router = useRouter();
// //     const supabase = createClient();

// //     // TODO: Make this dynamic - for now hardcoded since /login has no tenant in URL
// //     const DEFAULT_TENANT = "tealicious";

// //     const handleSubmit = async (e: React.FormEvent) => {
// //         e.preventDefault();
// //         setLoading(true);
// //         setError("");

// //         try {
// //             if (mode === "signup") {
// //                 const { data, error } = await supabase.auth.signUp({
// //                     email,
// //                     password,
// //                 });

// //                 if (error) throw error;

// //                 if (data.user) {
// //                     // Create profile
// //                     const { error: profileError } = await supabase
// //                         .from("profiles")
// //                         .insert({
// //                             id: data.user.id,
// //                             email,
// //                             full_name: fullName,
// //                             role,
// //                         });

// //                     if (profileError) throw profileError;

// //                     // Show success message
// //                     setError(""); // Clear any errors
// //                     alert(
// //                         "Account created! Check your email for verification link."
// //                     );
// //                 }
// //             } else {
// //                 const { error } = await supabase.auth.signInWithPassword({
// //                     email,
// //                     password,
// //                 });

// //                 if (error) throw error;

// //                 // Always redirect to mobile after login
// //                 router.push(`/${DEFAULT_TENANT}/mobile`);
// //                 router.refresh();
// //             }
// //             // eslint-disable-next-line @typescript-eslint/no-explicit-any
// //         } catch (error: any) {
// //             setError(error.message || "An error occurred. Please try again.");
// //         } finally {
// //             setLoading(false);
// //         }
// //     };

// //     return (
// //         <div className="w-full max-w-md mx-auto p-6">
// //             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
// //                 {/* Header */}
// //                 <div className="text-center mb-8">
// //                     <h1 className="text-2xl font-semibold text-gray-900 mb-2">
// //                         {mode === "login" ? "Welcome back" : "Create account"}
// //                     </h1>
// //                     <p className="text-sm text-gray-500">
// //                         {mode === "login"
// //                             ? "Sign in to your account to continue"
// //                             : "Sign up to get started"}
// //                     </p>
// //                 </div>

// //                 {/* Form */}
// //                 <form onSubmit={handleSubmit} className="space-y-5">
// //                     {/* Error Alert */}
// //                     {error && (
// //                         <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
// //                             {error}
// //                         </div>
// //                     )}

// //                     {/* Full Name - Signup Only */}
// //                     {mode === "signup" && (
// //                         <div className="space-y-2">
// //                             <label
// //                                 htmlFor="fullName"
// //                                 className="block text-sm font-medium text-gray-700"
// //                             >
// //                                 Full Name
// //                             </label>
// //                             <input
// //                                 id="fullName"
// //                                 type="text"
// //                                 value={fullName}
// //                                 onChange={(e) => setFullName(e.target.value)}
// //                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
// //                                 placeholder="John Doe"
// //                                 required
// //                             />
// //                         </div>
// //                     )}

// //                     {/* Email */}
// //                     <div className="space-y-2">
// //                         <label
// //                             htmlFor="email"
// //                             className="block text-sm font-medium text-gray-700"
// //                         >
// //                             Email
// //                         </label>
// //                         <input
// //                             id="email"
// //                             type="email"
// //                             value={email}
// //                             onChange={(e) => setEmail(e.target.value)}
// //                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
// //                             placeholder="you@example.com"
// //                             required
// //                         />
// //                     </div>

// //                     {/* Password */}
// //                     <div className="space-y-2">
// //                         <label
// //                             htmlFor="password"
// //                             className="block text-sm font-medium text-gray-700"
// //                         >
// //                             Password
// //                         </label>
// //                         <input
// //                             id="password"
// //                             type="password"
// //                             value={password}
// //                             onChange={(e) => setPassword(e.target.value)}
// //                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
// //                             placeholder="••••••••"
// //                             required
// //                             minLength={6}
// //                         />
// //                     </div>

// //                     {/* Role - Signup Only */}
// //                     {mode === "signup" && (
// //                         <div className="space-y-2">
// //                             <label
// //                                 htmlFor="role"
// //                                 className="block text-sm font-medium text-gray-700"
// //                             >
// //                                 Role
// //                             </label>
// //                             <select
// //                                 id="role"
// //                                 value={role}
// //                                 onChange={(e) =>
// //                                     setRole(
// //                                         e.target.value as "SELLER" | "ADMIN"
// //                                     )
// //                                 }
// //                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
// //                             >
// //                                 <option value="SELLER">Seller</option>
// //                                 <option value="ADMIN">Admin</option>
// //                             </select>
// //                         </div>
// //                     )}

// //                     {/* Submit Button */}
// //                     <button
// //                         type="submit"
// //                         disabled={loading}
// //                         className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
// //                     >
// //                         {loading
// //                             ? "Loading..."
// //                             : mode === "login"
// //                             ? "Sign in"
// //                             : "Create account"}
// //                     </button>
// //                 </form>

// //                 {/* Footer Link */}
// //                 <div className="mt-6 text-center text-sm text-gray-600">
// //                     {mode === "login" ? (
// //                         <p>
// //                             Don&apos;t have an account?{" "}
// //                             <a
// //                                 href="/signup"
// //                                 className="text-blue-600 hover:text-blue-700 font-medium"
// //                             >
// //                                 Sign up
// //                             </a>
// //                         </p>
// //                     ) : (
// //                         <p>
// //                             Already have an account?{" "}
// //                             <a
// //                                 href="/login"
// //                                 className="text-blue-600 hover:text-blue-700 font-medium"
// //                             >
// //                                 Sign in
// //                             </a>
// //                         </p>
// //                     )}
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // }

// "use client";
// import { useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useRouter } from "next/navigation";

// interface AuthFormProps {
//     mode: "login" | "signup";
// }

// export default function AuthForm({ mode }: AuthFormProps) {
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [fullName, setFullName] = useState("");
//     const [role, setRole] = useState<"SELLER" | "ADMIN">("SELLER");
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState("");

//     const router = useRouter();
//     const supabase = createClient();

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);
//         setError("");

//         try {
//             if (mode === "signup") {
//                 const { data, error } = await supabase.auth.signUp({
//                     email,
//                     password,
//                 });

//                 if (error) throw error;

//                 if (data.user) {
//                     // Create profile
//                     const { error: profileError } = await supabase
//                         .from("profiles")
//                         .insert({
//                             id: data.user.id,
//                             email,
//                             full_name: fullName,
//                             role,
//                         });

//                     if (profileError) throw profileError;

//                     // Show success message
//                     setError("");
//                     alert(
//                         "Account created! Check your email for verification link."
//                     );
//                 }
//             } else {
//                 const { error } = await supabase.auth.signInWithPassword({
//                     email,
//                     password,
//                 });

//                 if (error) throw error;

//                 // After login, fetch user's tenant assignments
//                 const {
//                     data: { user },
//                 } = await supabase.auth.getUser();

//                 if (!user) {
//                     throw new Error("Failed to get user after login");
//                 }

//                 const { data: tenantAssignments, error: assignmentError } =
//                     await supabase
//                         .from("user_tenant_assignments")
//                         .select("tenant_id, tenants(slug)")
//                         .eq("user_id", user.id);

//                 if (assignmentError) throw assignmentError;

//                 // No tenant assignments - show error
//                 if (!tenantAssignments || tenantAssignments.length === 0) {
//                     throw new Error(
//                         "No tenant access. Please contact your administrator."
//                     );
//                 }

//                 // Pick first tenant and redirect to mobile
//                 const firstTenant = tenantAssignments[0].tenants as {
//                     slug: string;
//                 } | null;

//                 if (!firstTenant?.slug) {
//                     throw new Error("Invalid tenant data");
//                 }

//                 // Redirect to first tenant's mobile page
//                 router.push(`/${firstTenant.slug}/mobile`);
//                 router.refresh();
//             }
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         } catch (error: any) {
//             setError(error.message || "An error occurred. Please try again.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-md mx-auto p-6">
//             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
//                 {/* Header */}
//                 <div className="text-center mb-8">
//                     <h1 className="text-2xl font-semibold text-gray-900 mb-2">
//                         {mode === "login" ? "Welcome back" : "Create account"}
//                     </h1>
//                     <p className="text-sm text-gray-500">
//                         {mode === "login"
//                             ? "Sign in to your account to continue"
//                             : "Sign up to get started"}
//                     </p>
//                 </div>

//                 {/* Form */}
//                 <form onSubmit={handleSubmit} className="space-y-5">
//                     {/* Error Alert */}
//                     {error && (
//                         <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
//                             {error}
//                         </div>
//                     )}

//                     {/* Full Name - Signup Only */}
//                     {mode === "signup" && (
//                         <div className="space-y-2">
//                             <label
//                                 htmlFor="fullName"
//                                 className="block text-sm font-medium text-gray-700"
//                             >
//                                 Full Name
//                             </label>
//                             <input
//                                 id="fullName"
//                                 type="text"
//                                 value={fullName}
//                                 onChange={(e) => setFullName(e.target.value)}
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                                 placeholder="John Doe"
//                                 required
//                             />
//                         </div>
//                     )}

//                     {/* Email */}
//                     <div className="space-y-2">
//                         <label
//                             htmlFor="email"
//                             className="block text-sm font-medium text-gray-700"
//                         >
//                             Email
//                         </label>
//                         <input
//                             id="email"
//                             type="email"
//                             value={email}
//                             onChange={(e) => setEmail(e.target.value)}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                             placeholder="you@example.com"
//                             required
//                         />
//                     </div>

//                     {/* Password */}
//                     <div className="space-y-2">
//                         <label
//                             htmlFor="password"
//                             className="block text-sm font-medium text-gray-700"
//                         >
//                             Password
//                         </label>
//                         <input
//                             id="password"
//                             type="password"
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                             placeholder="••••••••"
//                             required
//                             minLength={6}
//                         />
//                     </div>

//                     {/* Role - Signup Only */}
//                     {mode === "signup" && (
//                         <div className="space-y-2">
//                             <label
//                                 htmlFor="role"
//                                 className="block text-sm font-medium text-gray-700"
//                             >
//                                 Role
//                             </label>
//                             <select
//                                 id="role"
//                                 value={role}
//                                 onChange={(e) =>
//                                     setRole(
//                                         e.target.value as "SELLER" | "ADMIN"
//                                     )
//                                 }
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
//                             >
//                                 <option value="SELLER">Seller</option>
//                                 <option value="ADMIN">Admin</option>
//                             </select>
//                         </div>
//                     )}

//                     {/* Submit Button */}
//                     <button
//                         type="submit"
//                         disabled={loading}
//                         className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
//                     >
//                         {loading
//                             ? "Loading..."
//                             : mode === "login"
//                             ? "Sign in"
//                             : "Create account"}
//                     </button>
//                 </form>

//                 {/* Footer Link */}
//                 <div className="mt-6 text-center text-sm text-gray-600">
//                     {mode === "login" ? (
//                         <p>
//                             Don&apos;t have an account?{" "}
//                             <a
//                                 href="/signup"
//                                 className="text-blue-600 hover:text-blue-700 font-medium"
//                             >
//                                 Sign up
//                             </a>
//                         </p>
//                     ) : (
//                         <p>
//                             Already have an account?{" "}
//                             <a
//                                 href="/login"
//                                 className="text-blue-600 hover:text-blue-700 font-medium"
//                             >
//                                 Sign in
//                             </a>
//                         </p>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }

"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AuthFormProps {
    mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<"SELLER" | "ADMIN">("SELLER");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [redirecting, setRedirecting] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (mode === "signup") {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    const { error: profileError } = await supabase
                        .from("profiles")
                        .insert({
                            id: data.user.id,
                            email,
                            full_name: fullName,
                            role,
                        });

                    if (profileError) throw profileError;

                    setError("");
                    alert(
                        "Account created! Check your email for verification link."
                    );
                }
            } else {
                // ✅ Show processing state before redirect
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                // ✅ Set redirecting state
                setRedirecting(true);

                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    throw new Error("Failed to get user after login");
                }

                const { data: tenantAssignments, error: assignmentError } =
                    await supabase
                        .from("user_tenant_assignments")
                        .select("tenant_id, tenants(slug)")
                        .eq("user_id", user.id);

                if (assignmentError) throw assignmentError;

                if (!tenantAssignments || tenantAssignments.length === 0) {
                    throw new Error(
                        "No tenant access. Please contact your administrator."
                    );
                }

                // ✅ FIX: Handle both array and object types from Supabase
                const tenantsData = tenantAssignments[0].tenants;
                const firstTenant = Array.isArray(tenantsData)
                    ? tenantsData[0]
                    : tenantsData;

                if (!firstTenant?.slug) {
                    throw new Error("Invalid tenant data");
                }

                // ✅ Redirect with visible feedback
                router.push(`/${firstTenant.slug}/mobile`);
                router.refresh();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setError(error.message || "An error occurred. Please try again.");
            setRedirecting(false);
        } finally {
            if (!redirecting) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                        {mode === "login" ? "Welcome back" : "Create account"}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {mode === "login"
                            ? "Sign in to your account to continue"
                            : "Sign up to get started"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error Alert */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* ✅ Redirecting State */}
                    {redirecting && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                <span>Redirecting to your dashboard...</span>
                            </div>
                        </div>
                    )}

                    {/* Full Name - Signup Only */}
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label
                                htmlFor="fullName"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Full Name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="John Doe"
                                required
                                disabled={loading || redirecting}
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="you@example.com"
                            required
                            disabled={loading || redirecting}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            disabled={loading || redirecting}
                        />
                    </div>

                    {/* Role - Signup Only */}
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label
                                htmlFor="role"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Role
                            </label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) =>
                                    setRole(
                                        e.target.value as "SELLER" | "ADMIN"
                                    )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                                disabled={loading || redirecting}
                            >
                                <option value="SELLER">Seller</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || redirecting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {redirecting
                            ? "Redirecting..."
                            : loading
                            ? "Loading..."
                            : mode === "login"
                            ? "Sign in"
                            : "Create account"}
                    </button>
                </form>

                {/* Footer Link */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    {mode === "login" ? (
                        <p>
                            Don&apos;t have an account?{" "}
                            <a
                                href="/signup"
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Sign up
                            </a>
                        </p>
                    ) : (
                        <p>
                            Already have an account?{" "}
                            <a
                                href="/login"
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Sign in
                            </a>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
