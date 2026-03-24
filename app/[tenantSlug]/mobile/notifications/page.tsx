"use client";

const notifications = [
    {
        id: 1,
        type: "order",
        title: "New Order Received",
        message: "Order #1042 has been placed at Main Branch.",
        timestamp: "2 min ago",
        read: false,
    },
    {
        id: 2,
        type: "store",
        title: "Store Hours Updated",
        message: "Main Branch closing time changed to 10:00 PM.",
        timestamp: "1 hour ago",
        read: false,
    },
    {
        id: 3,
        type: "announcement",
        title: "New Promo Available",
        message: "Buy 2 Get 1 Free promo is now active until end of month.",
        timestamp: "3 hours ago",
        read: true,
    },
    {
        id: 4,
        type: "system",
        title: "System Maintenance",
        message: "Scheduled maintenance tonight from 12:00 AM - 2:00 AM.",
        timestamp: "Yesterday",
        read: true,
    },
    {
        id: 5,
        type: "order",
        title: "Order Cancelled",
        message: "Order #1038 was cancelled by the customer.",
        timestamp: "Yesterday",
        read: true,
    },
    {
        id: 6,
        type: "store",
        title: "Store Opened",
        message: "North Branch has been opened for today.",
        timestamp: "Yesterday",
        read: true,
    },
    {
        id: 7,
        type: "announcement",
        title: "Holiday Schedule",
        message: "All branches will close early on Dec 25.",
        timestamp: "2 days ago",
        read: true,
    },
    {
        id: 8,
        type: "order",
        title: "New Order Received",
        message: "Order #1035 has been placed at North Branch.",
        timestamp: "2 days ago",
        read: true,
    },
    {
        id: 9,
        type: "system",
        title: "App Updated",
        message: "Version 2.4.1 is now available with bug fixes.",
        timestamp: "3 days ago",
        read: true,
    },
    {
        id: 10,
        type: "order",
        title: "Order Completed",
        message: "Order #1030 has been marked as completed.",
        timestamp: "3 days ago",
        read: true,
    },
    {
        id: 11,
        type: "store",
        title: "Low Stock Alert",
        message: "Item 'Lemon Tart' is running low at Main Branch.",
        timestamp: "4 days ago",
        read: true,
    },
    {
        id: 12,
        type: "announcement",
        title: "New Staff Added",
        message: "Maria Santos has joined as a seller at North Branch.",
        timestamp: "4 days ago",
        read: true,
    },
];

const typeStyles: Record<
    string,
    { bg: string; dot: string; label: string; labelColor: string }
> = {
    order: {
        bg: "bg-blue-100",
        dot: "bg-blue-500",
        label: "Order",
        labelColor: "text-blue-500",
    },
    store: {
        bg: "bg-green-100",
        dot: "bg-green-500",
        label: "Store",
        labelColor: "text-green-500",
    },
    announcement: {
        bg: "bg-yellow-100",
        dot: "bg-yellow-500",
        label: "Announcement",
        labelColor: "text-yellow-500",
    },
    system: {
        bg: "bg-gray-100",
        dot: "bg-gray-400",
        label: "System",
        labelColor: "text-gray-400",
    },
};

export default function NotificationsPage() {
    return (
        <div className="space-y-4">
            <p className="text-2xl font-semibold tracking-tight text-gray-900">
                Notifications
            </p>
            <div className="space-y-2">
                {notifications.map((notif) => {
                    const style = typeStyles[notif.type];
                    return (
                        <div
                            key={notif.id}
                            className="flex items-start gap-3 p-4 rounded-2xl border border-gray-50 bg-white"
                        >
                            <div
                                className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${style.dot}`}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p
                                            className={`text-xs font-medium ${style.labelColor}`}
                                        >
                                            {style.label}
                                        </p>
                                        <p
                                            className={`text-sm text-gray-900 ${!notif.read ? "font-bold" : "font-semibold"}`}
                                        >
                                            {notif.title}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <p className="text-xs text-gray-400">
                                            {notif.timestamp}
                                        </p>
                                        {!notif.read && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {notif.message}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
