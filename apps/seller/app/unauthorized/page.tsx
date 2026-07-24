//app/unauthorized/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type User = {
    id: string;
    email: string;
    fullName: string;
    role: string;
};

// Reasons where the user has no valid destination in this app — never
// auto-redirect them back to a tenant (it would loop) and hide the dashboard
// button. Covers access denial and locked account statuses.
const TERMINAL_REASONS = new Set([
    "no-access",
    "suspended",
    "inactive",
    "pending",
]);

export default function UnauthorizedPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason");

    const [user, setUser] = useState<User | null>(null);
    // Seeded from the ?tenant= slug the proxy passes when it locks someone out,
    // so "Try again" has a destination without relying on a network call.
    const [validTenantSlug, setValidTenantSlug] = useState<string | null>(
        searchParams.get("tenant"),
    );
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        async function loadUser() {
            try {
                const res = await fetch("/api/users", {
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (error) {
                console.error("Failed to load user:", error);
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

                        // Auto-redirect users who have a valid destination.
                        // Terminal reasons (access denied, locked account) must
                        // NOT redirect — the proxy would just bounce them back.
                        if (!TERMINAL_REASONS.has(reason || "")) {
                            router.push(`/${data.tenants[0].slug}/mobile`);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to check tenants:", error);
            }
        }

        loadUser();
        checkValidTenant();
    }, [reason, router]);

    const handleSignOut = async () => {
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
        suspended: {
            title: "Account Suspended",
            description:
                "Your account has been suspended. Please contact your administrator to restore access.",
        },
        inactive: {
            title: "Account Deactivated",
            description:
                "Your account is no longer active. Please contact your administrator if you believe this is a mistake.",
        },
        pending: {
            title: "Account Pending",
            description:
                "Your account isn't active yet. Please complete setup or contact your administrator.",
        },
    };

    const message = messages[reason || ""] || {
        title: "Access Denied",
        description: "You don't have access to this resource.",
    };

    // A locked account (suspended/inactive/pending/no-access) has no valid
    // destination — show a lock, and its only real action is signing out.
    const isTerminal = TERMINAL_REASONS.has(reason || "");
    // Serious lock-outs read red; benign/config states read amber.
    const isSevere = reason === "suspended" || reason === "no-access";
    const accentBg = isSevere ? "bg-red-100" : "bg-amber-100";
    const accentText = isSevere ? "text-red-600" : "text-amber-600";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`rounded-full ${accentBg} p-3`}>
                        <svg
                            className={`h-8 w-8 ${accentText}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            {isTerminal ? (
                                // Lock — access restricted, not an error
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-6.75a2.25 2.25 0 012.25-2.25z"
                                />
                            ) : (
                                // Warning — configuration / setup issue
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            )}
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
                    {user && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
                            <p className="text-xs text-gray-500 mb-1">
                                Logged in as:
                            </p>
                            <p className="font-semibold text-gray-900 text-sm">
                                {user.fullName}
                            </p>
                            <p className="text-xs text-gray-600">
                                {user.email}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {validTenantSlug &&
                        (isTerminal ? (
                            // Re-check access. A full navigation (not <Link>) forces
                            // a fresh request through the proxy, so a reactivated
                            // user gets back in without signing out and back in.
                            <a
                                href={`/${validTenantSlug}/mobile`}
                                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition"
                            >
                                Try again
                            </a>
                        ) : (
                            <Link
                                href={`/${validTenantSlug}/mobile`}
                                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition"
                            >
                                Go to My Dashboard
                            </Link>
                        ))}

                    {/* Sign out is the primary action only when there's no
                        other path above it; otherwise it's a calm secondary. */}
                    <button
                        onClick={handleSignOut}
                        disabled={isLoggingOut}
                        className={
                            validTenantSlug
                                ? "block w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-center border border-gray-300 transition"
                                : "block w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg text-center transition"
                        }
                    >
                        {isLoggingOut ? "Signing out..." : "Sign out"}
                    </button>

                    {!isTerminal && (
                        <Link
                            href="/login"
                            className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-center border border-gray-300 transition"
                        >
                            Back to Login
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
