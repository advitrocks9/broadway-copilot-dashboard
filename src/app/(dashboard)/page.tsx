import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineArea, Bars } from "@/components/dashboard/Charts"
import { RangeTabs } from "@/components/dashboard/RangeTabs"

type RangeKey = "24h" | "7d" | "30d"

function getStartAndBucket(range: RangeKey): { start: Date; end: Date; bucket: "hour" | "day" } {
  const now = new Date()
  const start = new Date(
    range === "7d" ? now.getTime() - 7 * 86400000 : range === "30d" ? now.getTime() - 30 * 86400000 : now.getTime() - 86400000
  )
  const bucket: "hour" | "day" = range === "24h" ? "hour" : "day"
  return { start, end: now, bucket }
}

function formatBucketLabel(d: Date, bucket: "hour" | "day") {
  return bucket === "hour"
    ? `${d.getHours().toString().padStart(2, "0")}:00`
    : `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
}

function enumerateBuckets(start: Date, end: Date, bucket: "hour" | "day") {
  const stepMs = bucket === "hour" ? 3600000 : 86400000
  const points: { key: string; date: Date }[] = []
  const cursor = new Date(start.getTime() - (start.getTime() % stepMs))
  while (cursor <= end) {
    points.push({ key: formatBucketLabel(cursor, bucket), date: new Date(cursor) })
    cursor.setTime(cursor.getTime() + stepMs)
  }
  return points
}

/**
 * Returns top-level metrics for the dashboard within a time range.
 */
async function getTopMetrics(start: Date) {
  const [messages24h, errors24h, activeUsers, cost24h] = await Promise.all([
    prisma.message.count({ where: { createdAt: { gte: start } } }),
    prisma.graphRun.count({ where: { startTime: { gte: start }, status: "ERROR" } }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT user_id) AS count FROM (
        SELECT c."userId" AS user_id
        FROM "Message" m
        JOIN "Conversation" c ON c.id = m."conversationId"
        WHERE m."createdAt" >= ${start}
        UNION
        SELECT gr."userId" AS user_id
        FROM "GraphRun" gr
        WHERE gr."startTime" >= ${start}
      ) AS union_users
    `,
    prisma.$queryRaw<{ cost: number | null }[]>`
      SELECT COALESCE(SUM(CAST(lt."costUsd" AS DOUBLE PRECISION)), 0) AS cost
      FROM "LLMTrace" lt
      WHERE lt."startTime" >= ${start}
    `,
  ])

  return {
    messages: messages24h,
    errors: errors24h,
    activeUsers: Number(activeUsers?.[0]?.count ?? 0),
    costUsd: Number(cost24h?.[0]?.cost ?? 0),
  }
}

/**
 * Returns time-series for messages and error runs, zero-filled.
 */
async function getTimeSeries(start: Date, end: Date, bucket: "hour" | "day") {
  const trunc = bucket === "hour" ? "hour" : "day"

  const [msgRows, errRows] = await Promise.all([
    prisma.$queryRaw<{ ts: Date; value: number }[]>`
      SELECT date_trunc(${trunc}, m."createdAt") AS ts, COUNT(*)::int AS value
      FROM "Message" m
      WHERE m."createdAt" >= ${start} AND m."createdAt" <= ${end}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ ts: Date; value: number }[]>`
      SELECT date_trunc(${trunc}, gr."startTime") AS ts, COUNT(*)::int AS value
      FROM "GraphRun" gr
      WHERE gr."startTime" >= ${start} AND gr."startTime" <= ${end} AND gr.status = 'ERROR'
      GROUP BY 1
      ORDER BY 1
    `,
  ])

  const buckets = enumerateBuckets(start, end, bucket)
  const msgMap = new Map(msgRows.map(r => [formatBucketLabel(r.ts, bucket), r.value]))
  const errMap = new Map(errRows.map(r => [formatBucketLabel(r.ts, bucket), r.value]))

  const messages = buckets.map(b => ({ time: b.key, value: msgMap.get(b.key) ?? 0 }))
  const errors = buckets.map(b => ({ time: b.key, value: errMap.get(b.key) ?? 0 }))
  return { messages, errors }
}

/**
 * Returns cost breakdown by model for the period.
 */
async function getCostByModel(start: Date) {
  const rows = await prisma.$queryRaw<{ model: string; cost: number }[]>`
    SELECT lt.model AS model, COALESCE(SUM(CAST(lt."costUsd" AS DOUBLE PRECISION)), 0)::float AS cost
    FROM "LLMTrace" lt
    WHERE lt."startTime" >= ${start}
    GROUP BY lt.model
    ORDER BY cost DESC
    LIMIT 8
  `
  return rows
}

/**
 * Returns top users (by messages) during the period with aggregates.
 */
async function getTopUsers(start: Date) {
  const rows = await prisma.$queryRaw<{
    userId: string
    whatsappId: string
    lastActive: Date | null
    messages: number
    cost: number
  }[]>`
    WITH msgs AS (
      SELECT c."userId" AS user_id, COUNT(m.*)::int AS messages
      FROM "Conversation" c
      JOIN "Message" m ON m."conversationId" = c.id
      WHERE m."createdAt" >= ${start}
      GROUP BY c."userId"
    ),
    costs AS (
      SELECT gr."userId" AS user_id, COALESCE(SUM(CAST(lt."costUsd" AS DOUBLE PRECISION)), 0)::float AS cost
      FROM "GraphRun" gr
      JOIN "LLMTrace" lt ON lt."graphRunId" = gr.id
      WHERE lt."startTime" >= ${start}
      GROUP BY gr."userId"
    ),
    last_active AS (
      SELECT user_id, MAX(ts) AS last_active
      FROM (
        SELECT c."userId" AS user_id, MAX(m."createdAt") AS ts
        FROM "Conversation" c JOIN "Message" m ON m."conversationId" = c.id
        WHERE m."createdAt" >= ${start}
        GROUP BY c."userId"
        UNION ALL
        SELECT gr."userId" AS user_id, MAX(gr."startTime") AS ts
        FROM "GraphRun" gr
        WHERE gr."startTime" >= ${start}
        GROUP BY gr."userId"
      ) u
      GROUP BY user_id
    )
    SELECT u.id AS "userId", u."whatsappId", la.last_active AS "lastActive",
           COALESCE(ms.messages, 0)::int AS messages,
           COALESCE(cs.cost, 0)::float AS cost
    FROM "User" u
    LEFT JOIN msgs ms ON ms.user_id = u.id
    LEFT JOIN costs cs ON cs.user_id = u.id
    LEFT JOIN last_active la ON la.user_id = u.id
    WHERE COALESCE(ms.messages, 0) > 0 OR COALESCE(cs.cost, 0) > 0
    ORDER BY ms.messages DESC NULLS LAST, cs.cost DESC NULLS LAST
    LIMIT 10
  `
  return rows
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const rangeParam = (typeof sp.range === "string" ? sp.range : undefined) as RangeKey | undefined
  const range = rangeParam ?? "24h"
  const { start, end, bucket } = getStartAndBucket(range)

  const [top, series, byModel, topUsers] = await Promise.all([
    getTopMetrics(start),
    getTimeSeries(start, end, bucket),
    getCostByModel(start),
    getTopUsers(start),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview</h1>
        <RangeTabs initial={range} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Active users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{top.activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{top.messages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{top.errors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>LLM cost (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${top.costUsd.toFixed(4)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Messages over time</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <LineArea data={series.messages} color="#3b82f6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Errors over time</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <LineArea data={series.errors} color="#ef4444" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by model</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Bars data={byModel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Total cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell>{u.whatsappId}</TableCell>
                    <TableCell>{u.lastActive ? new Date(u.lastActive).toLocaleString() : "-"}</TableCell>
                    <TableCell>{u.messages}</TableCell>
                    <TableCell>${u.cost.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

