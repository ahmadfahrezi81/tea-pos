"use client";

import SharedFeedbackHistory from "@tea-pos/ui/custom/FeedbackHistory";
import useCustomerFeedbacks from "@/lib/hooks/customer-feedbacks/useCustomerFeedbacks";
import { useT } from "@/lib/hooks/useT";

/** Feeds the shared history this app's feedback and locale. */
export default function FeedbackHistory() {
    const { data, isLoading } = useCustomerFeedbacks({ limit: 100 });
    const t = useT();

    return (
        <SharedFeedbackHistory
            feedbacks={data?.feedbacks ?? []}
            isLoading={isLoading}
            t={t}
        />
    );
}
