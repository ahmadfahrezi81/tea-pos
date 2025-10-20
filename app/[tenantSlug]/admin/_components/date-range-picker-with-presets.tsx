// components/DateRangePickerWithPresets.tsx
"use client";

import * as React from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    subDays,
    subMonths,
    isSameDay,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Preset {
    label: string;
    range: DateRange;
}

interface Props {
    initialRange?: DateRange;
    presets?: Preset[];
    onChange?: (range: DateRange | undefined) => void;
    className?: string;
}

// Default presets
const getDefaultPresets = (): Preset[] => {
    const today = new Date();
    const yesterday = subDays(today, 1);

    return [
        {
            label: "Today",
            range: { from: today, to: today },
        },
        {
            label: "This Week",
            range: { from: subDays(today, 6), to: today },
        },
        {
            label: "This Month",
            range: { from: startOfMonth(today), to: today },
        },
        {
            label: "divider",
            range: { from: today, to: today }, // Placeholder, won't be used
        },
        {
            label: "Yesterday",
            range: { from: yesterday, to: yesterday },
        },
        {
            label: "Previous Week",
            range: { from: subDays(today, 13), to: subDays(today, 7) },
        },
        {
            label: "Previous Month",
            range: {
                from: startOfMonth(subMonths(today, 1)),
                to: endOfMonth(subMonths(today, 1)),
            },
        },
    ];
};

// Helper function to check if a range matches a preset
const findMatchingPreset = (
    range: DateRange | undefined,
    presets: Preset[]
): string | null => {
    if (!range?.from || !range?.to) return null;

    for (const preset of presets) {
        if (
            preset.range.from &&
            preset.range.to &&
            isSameDay(range.from, preset.range.from) &&
            isSameDay(range.to, preset.range.to)
        ) {
            return preset.label;
        }
    }
    return null;
};

export function DateRangePickerWithPresets({
    initialRange,
    presets = getDefaultPresets(),
    onChange,
    className,
}: Props) {
    const [range, setRange] = React.useState<DateRange | undefined>(
        initialRange
    );

    // Automatically detect which preset matches the initial range
    const [selectedPreset, setSelectedPreset] = React.useState<string | null>(
        () => findMatchingPreset(initialRange, presets)
    );

    const handleSelect = (selected: DateRange | undefined) => {
        setRange(selected);
        setSelectedPreset(findMatchingPreset(selected, presets));
        onChange?.(selected);
    };

    const handlePresetClick = (preset: Preset) => {
        setRange(preset.range);
        setSelectedPreset(preset.label);
        onChange?.(preset.range);
    };

    const displayLabel = range?.from
        ? range.to
            ? `${format(range.from, "d MMM yyyy")} - ${format(
                  range.to,
                  "d MMM yyyy"
              )}`
            : format(range.from, "d MMM yyyy")
        : "Select date range";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "h-9 px-3 text-left font-normal justify-start w-auto max-w-[240px]",
                        !range && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {displayLabel}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                    {/* Presets Sidebar */}
                    {presets.length > 0 && (
                        <div className="flex flex-col gap-1 border-r p-3 pr-4">
                            {presets.map((preset, index) => {
                                // Render divider
                                if (preset.label === "divider") {
                                    return (
                                        <div
                                            key={`divider-${index}`}
                                            className="my-1 border-t"
                                        />
                                    );
                                }

                                // Render preset button
                                return (
                                    <Button
                                        key={preset.label}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handlePresetClick(preset)
                                        }
                                        className={cn(
                                            "justify-start font-normal",
                                            selectedPreset === preset.label &&
                                                "bg-accent"
                                        )}
                                    >
                                        {preset.label}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                    {/* Calendar */}
                    <div className="p-3">
                        <Calendar
                            mode="range"
                            selected={range}
                            onSelect={handleSelect}
                            numberOfMonths={1}
                            defaultMonth={range?.from}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
