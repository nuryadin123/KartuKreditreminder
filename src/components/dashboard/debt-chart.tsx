"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";

interface DebtChartProps {
  data: { name: string; "Total Utang": number }[];
}

export function DebtChart({ data }: DebtChartProps) {
  const chartConfig = {
    "Total Utang": {
      label: "Total Utang",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="h-80 w-full">
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart
            data={data}
            margin={{
                top: 5,
                right: 20,
                left: 20,
                bottom: 5,
            }}
        >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
            />
            <YAxis
                tickFormatter={(value) => formatCurrency(Number(value)).replace("Rp", "Rp ")}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                    indicator="dot"
                    labelFormatter={(label, payload) => payload?.[0]?.payload.name}
                    formatter={(value) => formatCurrency(Number(value))}
                />}
            />
            <Bar dataKey="Total Utang" fill="var(--color-Total Utang)" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ChartContainer>
    </div>
  );
}
