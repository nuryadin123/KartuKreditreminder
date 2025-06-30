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

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Sanitize the name for use as a CSS variable key
const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');

export function DebtChart({ data }: DebtChartProps) {
  const { chartData, chartConfig } = React.useMemo(() => {
    const config: ChartConfig = {};
    const processedData = data.map((item, index) => {
      const sanitized = sanitizeName(item.name);
      config[sanitized] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
      return { ...item, key: sanitized };
    });
    return { chartData: processedData, chartConfig: config };
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
                nameKey="name" // The display name is still 'name'
                formatter={(value) => formatCurrency(Number(value))}
            />}
          />
          <Pie
            data={chartData} // Use processed data
            dataKey="Total Utang"
            nameKey="name"
            innerRadius="60%"
            strokeWidth={2}
          >
            {chartData.map((entry) => (
                <Cell 
                  key={`cell-${entry.key}`} 
                  fill={`var(--color-${entry.key})`}
                  className="focus:outline-none" 
                  />
            ))}
          </Pie>
           <ChartLegend
            content={<ChartLegendContent nameKey="key" />}
            className="-translate-y-2 flex-wrap justify-center"
          />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
