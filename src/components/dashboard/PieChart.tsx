"use client"

import { Pie, PieChart, Cell } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function ModelCostPieChart({
  data,
}: {
  data: { model: string; cost: number }[]
}) {
  const chartConfig = {
    cost: { label: "Cost" },
  } satisfies ChartConfig

  const colors = [
    "#22c55e",
    "#3b82f6",
    "#ef4444",
    "#a855f7",
    "#f59e0b",
    "#10b981",
    "#6366f1",
    "#f43f5e",
  ]

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle>Model cost split (last 7 days)</CardTitle>
        <CardDescription>Top models by spend</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="model" />} />
            <Pie data={data} dataKey="cost" nameKey="model" innerRadius={50} outerRadius={100} paddingAngle={2}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
