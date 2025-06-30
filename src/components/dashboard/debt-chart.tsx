"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface DebtChartProps {
  data: { name: string; "Total Utang": number }[];
}

// These HSL values correspond to the chart colors in globals.css
// Using them directly ensures consistency with the app's theme.
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function DebtChart({ data }: DebtChartProps) {
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [data]);


  return (
    <div className="h-72 w-full"> 
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent
                nameKey="name"
                formatter={(value) => formatCurrency(Number(value))}
            />}
          />
          <Pie
            data={data}
            dataKey="Total Utang"
            nameKey="name"
            innerRadius="60%"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} className="focus:outline-none" />
            ))}
          </Pie>
           <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            className="-translate-y-2 flex-wrap justify-center"
          />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
