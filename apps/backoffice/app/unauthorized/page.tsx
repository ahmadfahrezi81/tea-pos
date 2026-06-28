"use client";

import { useRouter, useSearchParams } from "next/navigation";

const messages: Record<string, { title: string; description: string }> = {
    "no-access": {
        title: "Access Denied",
        description: "Backoffice is for administrators only. Contact your admin if you believe this is a mistake.",
    },
    "no-tenant": {
        title: "No Tenant Access",
        description: "Your account isn't assigned to any tenant.",
    },
};

export default function UnauthorizedPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason") ?? "no-access";
    const message = messages[reason] ?? messages["no-access"];

    const handleLogout = async () => {
        await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
        router.push("/login");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">{message.title}</h1>
                <p className="text-sm text-gray-600">{message.description}</p>
                <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-xl active:opacity-80"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
