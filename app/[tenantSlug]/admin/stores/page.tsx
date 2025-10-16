// "use client";

// import React from "react";
// import { usePathname } from "next/navigation";

// const Page = () => {
//     const pathname = usePathname();

//     return (
//         <main className="flex items-center justify-center h-screen flex-col font-sans">
//             <p className="text-lg">
//                 Current Route: <strong>{pathname}</strong>
//             </p>
//         </main>
//     );
// };

// export default Page;

//app/[tenantSlug]/admin/stores/page.tsx

"use client";

import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { useTenant } from "../../TenantProvider";
import { useAllStores } from "@/lib/hooks/stores/useAllStores";
import { DataTable } from "./_components/data-table";
import { createColumns } from "./_components/columns";
import { ScopeBadge } from "../_components/scope-badge";

export default function StoresPage() {
    const { tenantId } = useTenant();
    const { data, error, isLoading } = useAllStores();

    const columns = createColumns();

    if (!tenantId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Tenant Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        Please select a tenant to view stores.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-4">
                        Loading stores...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500">Error</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-8 pt-6">
            {/* Scope Tagging */}
            <ScopeBadge />

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Store Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your stores and locations across your
                        organization.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="default" disabled>
                        <Store className="mr-2 h-4 w-4" />
                        Add Store
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={data?.stores || []} />
        </div>
    );
}
