import { Construction, type LucideIcon } from "lucide-react";

interface ComingSoonProps {
    title: string;
    subtitle?: string;
    /** Defaults to a construction icon. */
    icon?: LucideIcon;
}

/**
 * Full-height placeholder card for routes that are not built yet.
 * Callers pass display strings — this component never translates,
 * so apps without i18n can use it directly.
 */
export function ComingSoon({ title, subtitle, icon: Icon = Construction }: ComingSoonProps) {
    return (
        <div className="min-h-full bg-white rounded-2xl flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon className="w-12 h-12 text-gray-400" />
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                {subtitle && (
                    <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
