import DailySalesChart from "./_components/DailySalesChart";
import WorkDays from "./_components/WorkDays";

/* Two things, both tenant-wide over active stores: what was sold lately, and
   whether the shops have been opening. Anything more belongs on its own screen
   — a dashboard that answers ten questions answers none of them at a glance. */
export default function DashboardPage() {
    return (
        <div className="space-y-3">
            <DailySalesChart />
            <div className="space-y-1.5">
                <p className="pl-3 text-xs font-bold uppercase tracking-widest text-gray-700">
                    Open days
                </p>
                <WorkDays />
            </div>
        </div>
    );
}
