import DailySalesChart from "./_components/DailySalesChart";
import Greeting from "./_components/Greeting";
import Totals from "./_components/Totals";
import WorkDays from "./_components/WorkDays";

/* Two things, both tenant-wide over active stores: what was sold lately, and
   whether the shops have been opening. Anything more belongs on its own screen
   — a home screen that answers ten questions answers none of them at a glance. */
export default function HomePage() {
    return (
        <div className="space-y-3">
            <Greeting />
            <div className="grid grid-cols-2 gap-3">
                <WorkDays />
                <Totals />
            </div>
            <DailySalesChart />
        </div>
    );
}
