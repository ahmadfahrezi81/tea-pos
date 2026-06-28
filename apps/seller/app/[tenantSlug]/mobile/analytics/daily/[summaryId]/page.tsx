import { notFound } from "next/navigation";
import { getSSRClient } from "@/lib/supabase/ssr";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import {
    getSummaryById,
    getSummaryBreakdown,
    listSummaryPhotos,
} from "@tea-pos/services/summaries";
import { listExpenses } from "@tea-pos/services/expenses";
import { fetchSessionUsersForSummaries } from "@tea-pos/services/sessions";
import { DaySummaryDetails } from "./_components/DaySummaryDetails";
import type { SummaryShape, PhotoShape, ExpenseShape } from "./_components/DaySummaryDetails";

export default async function SummaryDetailPage({
    params,
}: {
    params: Promise<{ summaryId: string }>;
}) {
    const { summaryId } = await params;
    const [supabase, serviceClient, tenantId] = await Promise.all([
        getSSRClient(),
        Promise.resolve(getServiceClient()),
        getCurrentTenantId(),
    ]);

    let summary: SummaryShape;
    let breakdown: Record<string, { quantity: number; revenue: number }>;
    let photos: PhotoShape[];
    let expenses: ExpenseShape[];
    let sessionsMap: Record<string, Array<{ userId: string; userName: string | null; userAvatarUrl: string | null; totalCups: number | null }>>;

    try {
        const [rawSummary, rawBreakdown, rawPhotos, rawExpenses, rawSessions] = await Promise.all([
            getSummaryById(supabase, { tenantId, summaryId }),
            getSummaryBreakdown(supabase, { tenantId, summaryId }),
            listSummaryPhotos(supabase, { tenantId, dailySummaryId: summaryId }),
            listExpenses(supabase, { tenantId, dailySummaryId: summaryId }),
            fetchSessionUsersForSummaries(serviceClient, { tenantId, summaryIds: [summaryId] }),
        ]);
        summary = rawSummary as unknown as SummaryShape;
        breakdown = rawBreakdown.breakdown;
        photos = rawPhotos as unknown as PhotoShape[];
        expenses = rawExpenses as unknown as ExpenseShape[];
        sessionsMap = rawSessions;
    } catch {
        notFound();
    }

    const sessions = sessionsMap[summaryId] ?? [];

    const dateLabel = new Date(summary.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <DaySummaryDetails
            summary={summary}
            breakdown={breakdown}
            photos={photos}
            expenses={expenses}
            sessions={sessions}
            dateLabel={dateLabel}
        />
    );
}
