"use client"

import dynamic from "next/dynamic"

type RechartsAny = React.ComponentType<Record<string, unknown>>
const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart as unknown as RechartsAny), { ssr: false }) as RechartsAny
const Area = dynamic(() => import("recharts").then(m => m.Area as unknown as RechartsAny), { ssr: false }) as RechartsAny
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis as unknown as RechartsAny), { ssr: false }) as RechartsAny
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis as unknown as RechartsAny), { ssr: false }) as RechartsAny
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid as unknown as RechartsAny), { ssr: false }) as RechartsAny
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip as unknown as RechartsAny), { ssr: false }) as RechartsAny
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart as unknown as RechartsAny), { ssr: false }) as RechartsAny
const Bar = dynamic(() => import("recharts").then(m => m.Bar as unknown as RechartsAny), { ssr: false }) as RechartsAny

export function LineArea({ data, color }: { data: { time: string; value: number }[]; color: string }) {
  return (
    <AreaChart width={600} height={220} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Area type="monotone" dataKey="value" stroke={color} fill={color} />
    </AreaChart>
  )
}

export function Bars({ data }: { data: { model: string; cost: number }[] }) {
  return (
    <BarChart width={600} height={220} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="model" hide />
      <YAxis />
      <Tooltip />
      <Bar dataKey="cost" fill="#22c55e" />
    </BarChart>
  )
}


