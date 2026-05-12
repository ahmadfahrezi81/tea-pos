import { notFound } from "next/navigation";
import { TenantProvider } from "./TenantProvider";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";

export default async function TenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }>;
}) {
    const { tenantSlug } = await params;

    let tenantId: string;
    try {
        tenantId = await getCurrentTenantId();
    } catch {
        notFound();
    }

    return (
        <TenantProvider
            initialTenant={{ id: tenantId!, slug: tenantSlug, name: "" }}
        >
            {children}
        </TenantProvider>
    );
}
