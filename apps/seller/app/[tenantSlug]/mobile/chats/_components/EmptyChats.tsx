"use client";
import { Construction } from "lucide-react";
import { useT } from "@/lib/hooks/useT";

export default function EmptyChats() {
    const t = useT();
    return (
        <div className="min-h-full bg-white rounded-2xl flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                <Construction className="w-12 h-12 text-gray-400" />
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-gray-500">
                    {t("chats.emptyTitle")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                    {t("chats.emptySubtitle")}
                </p>
            </div>
        </div>
    );
}
