export default async function AdminDashboardPage({
    params,
}: {
    params: Promise<{ tenantSlug: string }>;
}) {
    const { tenantSlug } = await params;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">
                    Admin Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Tenant: <strong>{tenantSlug}</strong>
                </p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <DashboardCard title="Placeholder 1" value="—" />
                <DashboardCard title="Placeholder 2" value="—" />
                <DashboardCard title="Placeholder 3" value="—" />
            </section>

            <section className="border rounded-lg p-6 bg-card text-muted-foreground">
                <p>
                    This is an empty dashboard layout — start adding your
                    components here.
                </p>
            </section>
        </div>
    );
}

function DashboardCard({
    title,
    value,
}: {
    title: string;
    value: string | number;
}) {
    return (
        <div className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">
                {title}
            </h3>
            <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
    );
}
