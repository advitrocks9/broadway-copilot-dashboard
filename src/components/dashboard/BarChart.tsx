"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function MessagesErrorsBarChart({
  data,
}: {
  data: { time: string; messages: number; errors: number }[]
}) {
  const chartConfig = {
    messages: { label: "Messages", color: "var(--chart-1)" },
    errors: { label: "Errors", color: "var(--chart-2)" },
  } satisfies ChartConfig

  const totals = React.useMemo(() => {
    return data.reduce(
      (acc, cur) => {
        acc.messages += cur.messages
        acc.errors += cur.errors
        return acc
      },
      { messages: 0, errors: 0 },
    )
  }, [data])

  const [activeSeries, setActiveSeries] = React.useState<keyof typeof chartConfig>("messages")

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Messages and Errors (3-hour buckets)</CardTitle>
          <CardDescription>Last 7 days, 3-hour intervals</CardDescription>
        </div>
        <div className="flex">
          {["messages", "errors"].map((key) => {
            const series = key as keyof typeof chartConfig
            return (
              <button
                key={series}
                data-active={activeSeries === series}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveSeries(series)}
              >
                <span className="text-muted-foreground text-xs">{chartConfig[series].label}</span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {totals[series].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={activeSeries} fill={`var(--color-${activeSeries})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
