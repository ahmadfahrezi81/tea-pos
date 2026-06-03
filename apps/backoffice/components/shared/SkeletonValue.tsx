import { ReactNode } from "react";

export function SkeletonValue({
    loading,
    children,
    className = "h-6 w-12",
}: {
    loading: boolean;
    children: ReactNode;
    className?: string;
}) {
    if (!loading) return <>{children}</>;
    return <span className={`inline-block animate-pulse bg-gray-200 rounded-md ${className}`} />;
}
