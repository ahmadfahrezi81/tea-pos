// app/[tenantSlug]/mobile/page.tsx
export default function MobilePage() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Redirecting...</p>
            </div>
        </div>
    );
}
