// app/[tenantSlug]/mobile/analytics/daily/_components/DailyStepHeader.tsx
"use client";

import { Check } from "lucide-react";

interface Step {
    label: string;
}

interface DailyStepHeaderProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (index: number) => void; // only navigates to completed steps
}

export function DailyStepHeader({
    steps,
    currentStep,
    onStepClick,
}: DailyStepHeaderProps) {
    return (
        <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 w-full py-3">
            <div className="overflow-x-auto no-scrollbar">
                <div className="flex items-center min-w-max">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const isClickable = isCompleted && onStepClick;

                        return (
                            <div key={index} className="flex items-center">
                                {/* Step circle + label */}
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={() =>
                                            isClickable && onStepClick(index)
                                        }
                                        disabled={!isClickable}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                                            isCompleted
                                                ? "bg-brand text-white active:scale-95"
                                                : isCurrent
                                                  ? "bg-brand/20 text-brand border-2 border-brand"
                                                  : "bg-gray-100 text-gray-400"
                                        } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                                    >
                                        {isCompleted ? (
                                            <Check size={16} />
                                        ) : (
                                            index + 1
                                        )}
                                    </button>
                                    <p
                                        className={`text-xs font-medium whitespace-nowrap ${
                                            isCurrent
                                                ? "text-brand"
                                                : isCompleted
                                                  ? "text-brand/70"
                                                  : "text-gray-400"
                                        }`}
                                    >
                                        {step.label}
                                    </p>
                                </div>

                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-12 h-0.5 mx-2 mb-4 transition-colors shrink-0 ${
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
