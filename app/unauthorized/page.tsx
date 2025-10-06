export default async function UnauthorizedPage({
    searchParams,
}: {
    searchParams: Promise<{ reason?: string }>;
}) {
    const params = await searchParams; // ✅ unwrap Promise
    const reason = params.reason;

    const messages: Record<string, string> = {
        "no-tenant": "You don't have access to any tenants.",
        "invalid-tenant": "Invalid tenant configuration.",
        "tenant-not-found": "This tenant doesn't exist.",
        "no-access": "You don't have access to this tenant.",
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Access Denied
                </h1>
                <p className="text-gray-600 mb-6">
                    {messages[reason || ""] ||
                        "You don't have access to this resource."}
                </p>
                <a
                    href="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                >
                    Back to Login
                </a>
            </div>
        </div>
    );
}
