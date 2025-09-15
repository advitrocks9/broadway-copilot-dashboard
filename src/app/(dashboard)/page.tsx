import { prisma } from "@/lib/prisma"
import { SectionCards } from "@/components/section-cards"
import { MessagesErrorsBarChart } from "@/components/dashboard/BarChart"
import { ModelCostPieChart } from "@/components/dashboard/PieChart"
import { UsersLineChart } from "@/components/dashboard/LineChart"


function getLastWeek(): { start: Date; end: Date; bucket: "day" } {
  const now = new Date()
  const start = new Date(now.getTime() - 7 * 86400000)
  return { start, end: now, bucket: "day" }
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
 * Returns unique active users per bucket, zero-filled.
 */
async function getUsersSeries(start: Date, end: Date, bucket: "hour" | "day") {
  const trunc = bucket === "hour" ? "hour" : "day"

  const rows = await prisma.$queryRaw<{ ts: Date; value: number }[]>`
    WITH union_events AS (
      SELECT date_trunc(${trunc}, m."createdAt") AS ts, c."userId" AS user_id
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" <= ${end}
      UNION ALL
      SELECT date_trunc(${trunc}, gr."startTime") AS ts, gr."userId" AS user_id
      FROM "GraphRun" gr
      WHERE gr."startTime" >= ${start} AND gr."startTime" <= ${end}
    )
    SELECT ts, COUNT(DISTINCT user_id)::int AS value
    FROM union_events
    GROUP BY ts
    ORDER BY ts
  `

  const buckets = enumerateBuckets(start, end, bucket)
  const valueMap = new Map(rows.map(r => [formatBucketLabel(r.ts, bucket), r.value]))
  const users = buckets.map(b => ({ time: b.key, value: valueMap.get(b.key) ?? 0 }))
  return users
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

export default async function HomePage() {
  const { start, end, bucket } = getLastWeek()

  const [top, series, byModel, users] = await Promise.all([
    getTopMetrics(start),
    getTimeSeries(start, end, bucket),
    getCostByModel(start),
    getUsersSeries(start, end, bucket),
  ])

  const barData = series.messages.map((m, idx) => ({
    time: m.time,
    messages: m.value,
    errors: series.errors[idx]?.value ?? 0,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4 py-[22px] lg:px-6 lg:py-[24px] ">
        <h1 className="text-4xl font-semibold">Overview</h1>
      </div>

      <SectionCards activeUsers={top.activeUsers} messages={top.messages} errors={top.errors} costUsd={top.costUsd} />

      <div className="px-4 lg:px-6">
        <MessagesErrorsBarChart data={barData} />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <ModelCostPieChart data={byModel} />
        <UsersLineChart data={users} />
      </div>
    </div>
  )
}

