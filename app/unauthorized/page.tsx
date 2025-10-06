import { createServerComponentClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UnauthorizedPage({
    searchParams,
}: {
    searchParams: Promise<{ reason?: string }>;
}) {
    const params = await searchParams;
    const reason = params.reason;

    // ✅ Try to help user escape by checking their valid tenants
    const supabase = await createServerComponentClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let validTenantSlug: string | null = null;

    if (user) {
        const { data: tenantAssignments } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, tenants(slug)")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (tenantAssignments?.tenants) {
            // ✅ FIX: Handle both array and object types
            const tenantsData = tenantAssignments.tenants;
            const tenant = Array.isArray(tenantsData)
                ? tenantsData[0]
                : tenantsData;

            if (tenant?.slug) {
                validTenantSlug = tenant.slug;
            }
        }
    }

    // ✅ Auto-redirect if user has valid tenant
    if (validTenantSlug && reason !== "no-access") {
        redirect(`/${validTenantSlug}/mobile`);
    }

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
                    <p className="text-gray-600">{message.description}</p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {validTenantSlug && (
                        <a
                            href={`/${validTenantSlug}/mobile`}
                            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition"
                        >
                            Go to My Dashboard
                        </a>
                    )}
                    <a
                        href="/login"
                        className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-center border border-gray-300 transition"
                    >
                        {user ? "Switch Account" : "Back to Login"}
                    </a>
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
