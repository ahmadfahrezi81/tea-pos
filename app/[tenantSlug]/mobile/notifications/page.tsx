"use client";

import { useRouter } from "next/navigation";
import useNotifications from "@/lib/hooks/notifications/useNotifications";
import { NotificationResponse } from "@/lib/schemas/notifications";
import { Cloud, CloudSun, Store } from "lucide-react";
import { useTenantSlug } from "@/lib/tenant-url";
import { formatTimeAgo } from "@/lib/utils/formatTimeAgo";

const typeStyles: Record<string, { bg: string; dot: string; label: string }> = {
    weather_forecast: {
        bg: "bg-blue-100",
        dot: "bg-blue-500",
        label: "Weather Forecast",
    },
    store_opened: {
        bg: "bg-green-100",
        dot: "bg-green-500",
        label: "Store",
    },
};

function NotificationIcon({ type }: { type: string }) {
    if (type === "weather_forecast") {
        return (
            <div className="mt-0.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-sky-500">
                <CloudSun size={26} className="text-white" />
            </div>
        );
    }
    if (type === "store_opened") {
        return (
            <div className="mt-0.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-blue-500">
                <Store size={26} className="text-white" />
            </div>
        );
    }
    return (
        <div className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
        </div>
    );
}

export default function NotificationsPage() {
    const router = useRouter();
    const { data, isLoading } = useNotifications();
    const { url } = useTenantSlug();
    // and

    const notifications = data?.notifications ?? [];

    async function handleTap(notif: NotificationResponse) {
        await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });

        switch (notif.type) {
            case "weather_forecast":
                router.push(url(`/mobile/notifications/${notif.id}/weather`));
                break;
            case "store_opened":
                router.push(url(`/mobile/notifications/${notif.id}/store`));
                break;
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="h-20 rounded-2xl bg-gray-100 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Cloud className="w-10 h-10 mb-3" />
                <p className="text-sm">No notifications yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {notifications.map((notif) => {
                    const style =
                        typeStyles[notif.type] ?? typeStyles["store_opened"];
                    return (
                        <div
                            key={notif.id}
                            onClick={() => handleTap(notif)}
                            className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 bg-white cursor-pointer active:opacity-70 transition-opacity"
                        >
                            <NotificationIcon type={notif.type} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">
                                            {style.label}
                                        </p>
                                        <p
                                            className={`text-md text-gray-900 ${!notif.isRead ? "font-bold" : "font-semibold"}`}
                                        >
                                            {notif.title}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                        {!notif.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                        )}
                                        <p className="text-xs text-gray-500 font-medium">
                                            {formatTimeAgo(notif.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-0.5 pr-8">
                                    {notif.body}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
