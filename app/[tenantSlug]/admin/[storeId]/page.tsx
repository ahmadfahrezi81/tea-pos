// /app/[tenantSlug]/admin/[storeId]/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Store Dashboard",
};

export default function StoreDashboardPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Store Dashboard</h1>
            <p className="text-muted-foreground mt-2">
                Welcome to your store dashboard.
            </p>
            <div className="mt-6 rounded-md border p-4">
                <p>
                    This is the <strong>store-level</strong> dashboard. Here you
                    can show sales metrics, performance charts, and more
                    specific content for this store.
                </p>
            </div>
        </div>
    );
}
