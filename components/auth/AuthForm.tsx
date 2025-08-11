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
    const [role, setRole] = useState<"seller" | "manager">("seller");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
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
                    // Create profile
                    const { error: profileError } = await supabase
                        .from("profiles")
                        .insert({
                            id: data.user.id,
                            email,
                            full_name: fullName,
                            role,
                        });

                    if (profileError) throw profileError;

                    alert("Check your email for verification link!");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
                router.push("/dashboard");
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded">
                    {error}
                </div>
            )}

            {mode === "signup" && (
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                        required
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    required
                />
            </div>

            {mode === "signup" && (
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Role
                    </label>
                    <select
                        value={role}
                        onChange={(e) =>
                            setRole(e.target.value as "seller" | "manager")
                        }
                        className="w-full p-3 border rounded-lg"
                    >
                        <option value="seller">Seller</option>
                        <option value="manager">Manager</option>
                    </select>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
                {loading
                    ? "Loading..."
                    : mode === "login"
                    ? "Sign In"
                    : "Sign Up"}
            </button>
        </form>
    );
}
