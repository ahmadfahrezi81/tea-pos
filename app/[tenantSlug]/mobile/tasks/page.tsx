"use client";

import { useTenantSlug } from "@/lib/server/config/tenant-url";
import { navigation } from "@/lib/shared/utils/navigation";
import TasksProgressBar from "./_components/TasksProgressBar";
import { Store, FileText, Receipt, TrendingDown, Lock } from "lucide-react";

const events = [
    { time: "13:00", icon: "ice", label: "Ice Delivery" },
    { time: "11:00", icon: "tea", label: "Tea Delivery" },
    { time: "16:00", icon: "tea", label: "Tea Delivery" },
    { time: "19:00", icon: "delivery", label: "Stock Delivery" },
];

const tasks = [
    {
        key: "open",
        icon: Store,
        title: "Open Day",
        description: "Initialize today's summary and opening balance.",
        href: "/mobile/tasks/open",
    },
    {
        key: "expense",
        icon: TrendingDown,
        title: "Add Expense",
        description: "Record operational expenses for today's shift.",
        href: "/mobile/tasks/expense",
    },
    {
        key: "request",
        icon: Receipt,
        title: "Request",
        description: "Submit a request for supplies or store needs.",
        href: "/mobile/tasks/request",
    },
    {
        key: "close",
        icon: Lock,
        title: "Close Day",
        description: "Count cash, reconcile, and close today's summary.",
        href: "/mobile/tasks/close",
    },
];

export default function TasksPage() {
    const { url } = useTenantSlug();

    return (
        <div className="flex flex-col gap-4 pt-2">
            <TasksProgressBar
                openTime="10:00"
                closeTime="22:00"
                currentTime="10:45"
                events={events}
            />

            <div className="flex flex-col gap-3">
                {tasks.map((task) => {
                    const Icon = task.icon;
                    return (
                        <div
                            key={task.key}
                            className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="shrink-0 text-gray-500">
                                    <Icon size={22} strokeWidth={1.75} />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-gray-900">
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {task.description}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigation.push(url(task.href))}
                                className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Open
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
