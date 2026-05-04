import { MailOpen } from "lucide-react";

export default function EmptyInbox() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-24 text-gray-400 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <MailOpen className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-gray-500">
                    Your inbox is empty
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                    Messages will appear here
                </p>
            </div>
        </div>
    );
}
