//app/admin/page.tsx

import Link from "next/link";

export default function AdminPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                    POS System - Admin
                </h1>
                <div className="space-x-4">
                    <Link
                        href="/login"
                        className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
                    >
                        Login
                    </Link>
                    <Link
                        href="/signup"
                        className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600"
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}
