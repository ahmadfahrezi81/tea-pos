import { useState } from "react";
import {
    CreateCustomerFeedbackInput,
    CreateCustomerFeedbackResponse,
} from "@/lib/shared/schemas/customer-feedbacks";

interface UseCreateCustomerFeedbackResult {
    submit: (
        input: CreateCustomerFeedbackInput,
    ) => Promise<CreateCustomerFeedbackResponse | null>;
    isLoading: boolean;
    error: string | null;
    reset: () => void;
}

export default function useCreateCustomerFeedback(): UseCreateCustomerFeedbackResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => setError(null);

    const submit = async (
        input: CreateCustomerFeedbackInput,
    ): Promise<CreateCustomerFeedbackResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/customer-feedbacks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });

            if (!res.ok) {
                let errMsg = `Failed to submit feedback: ${res.status}`;
                try {
                    const body = await res.json();
                    if (body?.error) errMsg += ` - ${body.error}`;
                } catch {
                    // ignore
                }
                throw new Error(errMsg);
            }

            const json = await res.json();
            const parsed = CreateCustomerFeedbackResponse.safeParse(json);

            if (!parsed.success) {
                console.error(
                    "Invalid create feedback response:",
                    parsed.error.format(),
                );
                throw new Error("Invalid response shape from server");
            }

            return parsed.data;
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { submit, isLoading, error, reset };
}
