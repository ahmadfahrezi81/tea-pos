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
        <div className="w-full pb-3">
            <div
                ref={scrollRef}
                className="overflow-x-auto [&::-webkit-scrollbar]:hidden"
            >
                <div className="flex items-center min-w-max">
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
                                <div className="flex flex-col items-center gap-0.5">
                                    <button
                                        onClick={() =>
                                            isClickable && onStepClick(index)
                                        }
                                        disabled={!isClickable}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                            isCompleted
                                                ? "bg-brand text-white active:scale-95"
                                                : isCurrent
                                                  ? "bg-brand/10 text-brand border-2 border-brand"
                                                  : "bg-gray-300 text-gray-500"
                                        } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                                    >
                                        {isCompleted ? (
                                            <Check size={18} />
                                        ) : (
                                            index + 1
                                        )}
                                    </button>
                                    <p
                                        className={`text-xs font-medium whitespace-nowrap ${
                                            isCurrent
                                                ? "text-brand"
                                                : isCompleted
                                                  ? "text-brand/80"
                                                  : "text-gray-500"
                                        }`}
                                    >
                                        {step.label}
                                    </p>
                                </div>

                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-5 h-0.5 mx-1.5 mb-4 transition-colors shrink-0 ${
                                            isCompleted
                                                ? "bg-brand"
                                                : "bg-gray-300"
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
