
"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, Cell, CartesianGrid } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface DebtChartProps {
  data: { name: string; "Total Utang": number }[];
}

const chartConfig = {
  "Total Utang": {
    label: "Total Utang",
  },
} satisfies ChartConfig

export function DebtChart({ data }: DebtChartProps) {
  return (
    <div className="h-96 w-full">
      <ChartContainer config={chartConfig}>
        <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
            barCategoryGap="20%"
        >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                angle={-45}
                textAnchor="end"
                interval={0}
            />
            <YAxis
                type="number"
                tickFormatter={(value) => {
                    const num = Number(value);
                    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}Jt`;
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}Rb`;
                    return `${num}`;
                }}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                />}
            />
            <Bar
                dataKey="Total Utang"
                radius={[4, 4, 0, 0]}
            >
                {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 10) + 1}))`} />
                ))}
            </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
