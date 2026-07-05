import { notFound } from "next/navigation";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";

export default async function TenantLayout({
    children,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }>;
}) {
    try {
        await getCurrentTenantId();
    } catch {
        notFound();
    }

    return <>{children}</>;
}
