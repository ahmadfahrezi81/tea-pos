import { redirect } from "next/navigation";

export default function MobilePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
    return redirect("dashboard");
}
