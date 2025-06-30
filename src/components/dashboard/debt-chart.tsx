"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

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
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function DebtChart({ data }: DebtChartProps) {
  return (
    <div className="h-80 w-full">
      <ChartContainer config={chartConfig}>
        <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            barCategoryGap="20%"
        >
          <XAxis 
            type="number" 
            hide 
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 18)}...` : value}
            width={140}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value))}
            />}
          />
          <Bar 
            dataKey="Total Utang" 
            fill="var(--color-Total Utang)" 
            radius={4}
            layout="vertical"
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
