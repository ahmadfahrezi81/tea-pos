//app/unauthorized/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Profile = {
    id: string;
    email: string;
    fullName: string;
    role: string;
};

export default function UnauthorizedPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason");

    const [profile, setProfile] = useState<Profile | null>(null);
    const [validTenantSlug, setValidTenantSlug] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/profiles", {
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
            }
        }

        async function checkValidTenant() {
            try {
                const res = await fetch("/api/tenants", {
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.tenants && data.tenants.length > 0) {
                        setValidTenantSlug(data.tenants[0].slug);

                        // Auto-redirect if user has valid tenant and not "no-access"
                        if (reason !== "no-access") {
                            router.push(`/${data.tenants[0].slug}/mobile`);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to check tenants:", error);
            }
        }

        loadProfile();
        checkValidTenant();
    }, [reason, router]);

    const handleLogout = async () => {
        const confirmed = window.confirm("Are you sure you want to log out?");
        if (!confirmed) return;

        setIsLoggingOut(true);

        try {
            await fetch("/api/auth/signout", {
                method: "POST",
                credentials: "include",
            });

            router.push("/login");
        } catch (error) {
            console.error("Logout error:", error);
            router.push("/login");
        }
    };

    const messages: Record<string, { title: string; description: string }> = {
        "no-tenant": {
            title: "No Tenant Access",
            description:
                "Your account isn't assigned to any tenant. Please contact your administrator to grant you access.",
        },
        "invalid-tenant": {
            title: "Invalid Configuration",
            description:
                "There's an issue with your tenant setup. Please contact support for assistance.",
        },
        "tenant-not-found": {
            title: "Tenant Not Found",
            description:
                "The tenant you're trying to access doesn't exist. Please check the URL or contact support.",
        },
        "no-access": {
            title: "Access Denied",
            description:
                "You don't have permission to access this tenant. Please contact your administrator.",
        },
    };

    const message = messages[reason || ""] || {
        title: "Access Denied",
        description: "You don't have access to this resource.",
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-red-100 p-3">
                        <svg
                            className="h-8 w-8 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {message.title}
                    </h1>
                    <p className="text-gray-600 mb-4">{message.description}</p>

                    {/* Current User Info */}
                    {profile && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
                            <p className="text-xs text-gray-500 mb-1">
                                Logged in as:
                            </p>
                            <p className="font-semibold text-gray-900 text-sm">
                                {profile.fullName}
                            </p>
                            <p className="text-xs text-gray-600">
                                {profile.email}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {validTenantSlug && (
                        <Link
                            href={`/${validTenantSlug}/mobile`}
                            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition"
                        >
                            Go to My Dashboard
                        </Link>
                    )}

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="block w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg text-center transition"
                    >
                        {isLoggingOut ? "Logging out..." : "Log Out"}
                    </button>

                    <Link
                        href="/login"
                        className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-center border border-gray-300 transition"
                    >
                        Back to Login
                    </Link>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    Need help?{" "}
                    <a
                        href="mailto:support@yourcompany.com"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}
