import { useState } from "react";
import { feedbacksApi } from "@/lib/api/customer-feedbacks";
import type { CreateCustomerFeedbackInput, CreateCustomerFeedbackResponse } from "@tea-pos/features/customer-feedbacks/schema";

interface UseCreateCustomerFeedbackResult {
    submit: (input: CreateCustomerFeedbackInput) => Promise<CreateCustomerFeedbackResponse | null>;
    isLoading: boolean;
    error: string | null;
    reset: () => void;
}

export default function useCreateCustomerFeedback(): UseCreateCustomerFeedbackResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => setError(null);

    const submit = async (input: CreateCustomerFeedbackInput): Promise<CreateCustomerFeedbackResponse | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await feedbacksApi.create(input);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { submit, isLoading, error, reset };
}
