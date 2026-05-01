import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingUp } from "lucide-react";

interface DayData {
    day: string;
    cups: number;
}

// Sample data - average cups per day of the week
const sampleDayData: DayData[] = [
    { day: "Mon", cups: 145 },
    { day: "Tue", cups: 132 },
    { day: "Wed", cups: 178 },
    { day: "Thu", cups: 163 },
    { day: "Fri", cups: 215 },
    { day: "Sat", cups: 247 },
    { day: "Sun", cups: 205 },
];

const chartConfig = {
    cups: {
        label: "Cups",
        color: "#3E92CC",
    },
};

export default function AverageDayPerformance({
    data = sampleDayData,
}: {
    data?: DayData[];
}) {
    // Find the top performing day
    const topDay = data.reduce((max, item) =>
        item.cups > max.cups ? item : max
    );

    // Calculate average for comparison
    const averageCups = Math.round(
        data.reduce((sum, item) => sum + item.cups, 0) / data.length
    );

    const percentageAboveAvg = Math.round(
        ((topDay.cups - averageCups) / averageCups) * 100
    );

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle>Average Day Performance</CardTitle>
                        <CardDescription>
                            Average cups sold per day of the week
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Top day</p>
                        <p className="text-2xl font-bold text-primary">
                            {topDay.day}
                        </p>
                        <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="font-semibold">
                                +{percentageAboveAvg}% vs avg
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="h-[300px] w-full"
                >
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${value}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                            dataKey="cups"
                            fill="var(--color-cups)"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ChartContainer>
                <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Weekly Average
                        </span>
                        <span className="font-medium">
                            {averageCups} cups/day
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
