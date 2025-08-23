"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Store } from "@/lib/types";
import { useStores } from "@/lib/hooks/useData";
import packageJson from "../../package.json";

interface MobileAuthProps {
    profile: Profile | null;
    mutate: () => void;
}

export default function MobileAuth({ profile, mutate }: MobileAuthProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const supabase = createClient();
    const { data: stores = [], isLoading: storesLoading } = useStores(
        profile?.role ?? "",
        profile?.id ?? ""
    );

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(() => {
            mutate(); // re-fetch profile on login/logout
        });
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [mutate, supabase]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            mutate(); // ensure fresh profile after login
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const shouldLogout = window.confirm(
            "Are you sure you want to log out?"
        );
        if (shouldLogout) {
            await supabase.auth.signOut();
        }
    };

    // If user is logged in, show profile
    // if (user && profile) {
    if (profile) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                    {/* <h2 className="text-2xl font-bold mb-6 text-center">
                        Your Profile
                    </h2> */}

                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-white text-xl font-bold">
                                        {profile.full_name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {profile.full_name}
                                </h3>
                                <p className="text-gray-600">{profile.email}</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Role:</span>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        profile.role === "manager"
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-green-100 text-green-800"
                                    }`}
                                >
                                    {profile.role.charAt(0).toUpperCase() +
                                        profile.role.slice(1)}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">
                                    Member since:
                                </span>
                                <span className="text-gray-800">
                                    {new Date(
                                        profile.created_at
                                    ).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <span className="text-gray-600">
                                    Assigned Stores:
                                </span>
                                <div className="text-right text-sm">
                                    {storesLoading ? (
                                        <span className="text-gray-500">
                                            Loading...
                                        </span>
                                    ) : stores.length > 0 ? (
                                        <div className="space-y-1">
                                            {stores.map((store: Store) => (
                                                <div
                                                    key={store.id}
                                                    className="text-gray-800"
                                                >
                                                    {store.name}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">
                                            No stores assigned
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Logout Button */}
                        <div className="text-center">
                            <button
                                onClick={handleLogout}
                                className="text-sm font-bold text-red-600 hover:text-red-800 border-1 p-2 px-6 rounded-full"
                            >
                                Log Out
                            </button>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 text-center">
                            TEA-POS v{packageJson.version}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-gray-600 text-sm">
                        Use the tabs below to access POS and Orders
                    </p>
                </div>
            </div>
        );
    }

    // Login form
    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        This mobile interface is designed for sellers
                    </p>
                </div>
            </div>
        </div>
    );
}
