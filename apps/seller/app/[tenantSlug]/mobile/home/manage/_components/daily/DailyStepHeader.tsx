// app/[tenantSlug]/mobile/analytics/daily/_components/DailyStepHeader.tsx
"use client";

import { Check } from "lucide-react";
import { useRef, useEffect } from "react";

interface Step {
    label: string;
}

interface DailyStepHeaderProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (index: number) => void;
}

export function DailyStepHeader({
    steps,
    currentStep,
    onStepClick,
}: DailyStepHeaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Auto-scroll to current step on mount and step change
    useEffect(() => {
        const container = scrollRef.current;
        const currentEl = stepRefs.current[currentStep];
        if (!container || !currentEl) return;

        const containerWidth = container.offsetWidth;
        const elLeft = currentEl.offsetLeft;
        const elWidth = currentEl.offsetWidth;

        // Center the current step in the scroll container
        const scrollTo = elLeft - containerWidth / 2 + elWidth / 2;
        container.scrollTo({ left: scrollTo, behavior: "smooth" });
    }, [currentStep]);

    return (
        <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 w-full py-1">
            <div
                ref={scrollRef}
                className="overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
                <div className="flex items-center min-w-max pb-2">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const isClickable = isCompleted && onStepClick;

                        return (
                            <div
                                key={index}
                                ref={(el) => {
                                    stepRefs.current[index] = el;
                                }}
                                className="flex items-center"
                            >
                                {/* Step circle + label */}
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={() =>
                                            isClickable && onStepClick(index)
                                        }
                                        disabled={!isClickable}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                                            isCompleted
                                                ? "bg-brand text-white active:scale-95"
                                                : isCurrent
                                                  ? "bg-brand/10 text-brand border-2 border-brand"
                                                  : "bg-gray-100 text-gray-400"
                                        } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                                    >
                                        {isCompleted ? (
                                            <Check size={26} />
                                        ) : (
                                            index + 1
                                        )}
                                    </button>
                                    <p
                                        className={`text-sm font-medium whitespace-nowrap ${
                                            isCurrent
                                                ? "text-brand"
                                                : isCompleted
                                                  ? "text-brand/80"
                                                  : "text-gray-400"
                                        }`}
                                    >
                                        {step.label}
                                    </p>
                                </div>

                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-6 h-0.5 mx-2 mb-4 transition-colors shrink-0 ${
                                            isCompleted
                                                ? "bg-brand"
                                                : "bg-gray-200"
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
