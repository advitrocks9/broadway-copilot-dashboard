import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Delta = number | undefined

function DeltaBadge({ delta }: { delta: Delta }) {
  if (typeof delta !== "number") return null
  const isUp = delta >= 0
  const value = `${isUp ? "+" : ""}${delta.toFixed(1)}%`
  return (
    <Badge variant="outline">
      {isUp ? <IconTrendingUp /> : <IconTrendingDown />}
      {value}
    </Badge>
  )
}

export function SectionCards({
  activeUsers,
  messages,
  errors,
  costUsd,
  deltas,
}: {
  activeUsers: number
  messages: number
  errors: number
  costUsd: number
  deltas?: { activeUsers?: Delta; messages?: Delta; errors?: Delta; costUsd?: Delta }
}) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-2 lg:px-6">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active users (last 7 days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeUsers}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={deltas?.activeUsers} />
          </CardAction>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total messages (last 7 days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {messages}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={deltas?.messages} />
          </CardAction>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total errors (last 7 days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {errors}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={deltas?.errors} />
          </CardAction>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total cost (USD, last 7 days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${costUsd.toFixed(4)}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={deltas?.costUsd} />
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  )
}
