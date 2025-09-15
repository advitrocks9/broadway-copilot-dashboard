"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, Pie, PieChart, Cell, BarChart, Bar } from "recharts"

type TimePoint = { time: string; value: number }
type ModelCost = { model: string; cost: number }

export function DashboardChartsClient({
  messages,
  errors,
  byModel,
}: {
  messages: TimePoint[]
  errors: TimePoint[]
  byModel: ModelCost[]
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Messages over time</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{ value: { label: "Messages", color: "#3b82f6" } }} className="h-[260px]">
              <AreaChart data={messages}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={16} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area dataKey="value" type="monotone" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Errors over time</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{ value: { label: "Errors", color: "#ef4444" } }} className="h-[260px]">
              <AreaChart data={errors}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={16} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area dataKey="value" type="monotone" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost by model (bar)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{ cost: { label: "Cost", color: "#22c55e" } }} className="h-[260px]">
              <BarChart data={byModel}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="model" tickLine={false} axisLine={false} hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="model" />} />
                <Bar dataKey="cost" fill="#22c55e" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost distribution (pie)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{}} className="h-[260px]">
              <PieChart>
                <Pie data={byModel} dataKey="cost" nameKey="model" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byModel.map((_, idx) => (
                    <Cell key={idx} fill={["#22c55e","#3b82f6","#ef4444","#a855f7","#f59e0b","#10b981","#6366f1","#f43f5e"][idx % 8]} />
                  ))}
                </Pie>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="model" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}


