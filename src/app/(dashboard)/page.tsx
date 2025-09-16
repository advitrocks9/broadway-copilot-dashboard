import { prisma } from "@/lib/prisma"
import { SectionCards } from "@/components/dashboard/section-cards"
import { MessagesErrorsBarChart } from "@/components/dashboard/BarChart"
import { ModelCostPieChart } from "@/components/dashboard/PieChart"
import { UsersLineChart } from "@/components/dashboard/LineChart"

type TopMetrics = {
  messages: number
  errors: number
  activeUsers: number
  costUsd: number
}

type TimeSeriesDataPoint = {
  time: string
  value: number
}

type TimeSeries = {
  messages: TimeSeriesDataPoint[]
  errors: TimeSeriesDataPoint[]
}

type ModelCost = {
  model: string
  cost: number
}

/** Returns start and end dates for last week */
function getLastWeek(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getTime() - 7 * 86400000)
  return { start, end: now }
}

/** Formats date into bucket label string */
function formatBucketLabel(d: Date, includeTime: boolean) {
  const yyyy = d.getFullYear()
  const mm = (d.getMonth() + 1).toString().padStart(2, "0")
  const dd = d.getDate().toString().padStart(2, "0")
  if (!includeTime) return `${yyyy}-${mm}-${dd}`
  const hh = d.getHours().toString().padStart(2, "0")
  const min = d.getMinutes().toString().padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

/** Enumerates time buckets between start and end dates */
function enumerateBuckets(start: Date, end: Date, stepMs: number) {
  const points: { key: string; date: Date }[] = []
  const alignedStart = new Date(Math.floor(start.getTime() / stepMs) * stepMs)
  const cursor = new Date(alignedStart)
  while (cursor <= end) {
    points.push({ key: formatBucketLabel(cursor, true), date: new Date(cursor) })
    cursor.setTime(cursor.getTime() + stepMs)
  }
  return points
}

/** Returns top-level dashboard metrics */
async function getTopMetrics(start: Date): Promise<TopMetrics> {
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

/** Returns time-series data for messages and errors */
async function getTimeSeries(
  start: Date,
  end: Date,
  bucketHours: number
): Promise<TimeSeries> {
  const bucketSeconds = bucketHours * 3600

  const [msgRows, errRows] = await Promise.all([
    prisma.$queryRaw<{ ts: Date; value: number }[]>`
      SELECT to_timestamp(floor(extract(epoch from m."createdAt")/${bucketSeconds})*${bucketSeconds}) AS ts,
             COUNT(*)::int AS value
      FROM "Message" m
      WHERE m."createdAt" >= ${start} AND m."createdAt" <= ${end}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ ts: Date; value: number }[]>`
      SELECT to_timestamp(floor(extract(epoch from gr."startTime")/${bucketSeconds})*${bucketSeconds}) AS ts,
             COUNT(*)::int AS value
      FROM "GraphRun" gr
      WHERE gr."startTime" >= ${start} AND gr."startTime" <= ${end} AND gr.status = 'ERROR'
      GROUP BY 1
      ORDER BY 1
    `,
  ])

  const stepMs = bucketSeconds * 1000
  const buckets = enumerateBuckets(start, end, stepMs)
  const msgMap = new Map(msgRows.map(r => [formatBucketLabel(r.ts, true), r.value]))
  const errMap = new Map(errRows.map(r => [formatBucketLabel(r.ts, true), r.value]))

  const messages = buckets.map(b => ({ time: b.key, value: msgMap.get(b.key) ?? 0 }))
  const errors = buckets.map(b => ({ time: b.key, value: errMap.get(b.key) ?? 0 }))
  return { messages, errors }
}

/** Returns unique active users per time bucket */
async function getUsersSeries(
  start: Date,
  end: Date,
  bucketHours: number
): Promise<TimeSeriesDataPoint[]> {
  const bucketSeconds = bucketHours * 3600

  const rows = await prisma.$queryRaw<{ ts: Date; value: number }[]>`
    WITH union_events AS (
      SELECT to_timestamp(floor(extract(epoch from m."createdAt")/${bucketSeconds})*${bucketSeconds}) AS ts,
             c."userId" AS user_id
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" <= ${end}
      UNION ALL
      SELECT to_timestamp(floor(extract(epoch from gr."startTime")/${bucketSeconds})*${bucketSeconds}) AS ts,
             gr."userId" AS user_id
      FROM "GraphRun" gr
      WHERE gr."startTime" >= ${start} AND gr."startTime" <= ${end}
    )
    SELECT ts, COUNT(DISTINCT user_id)::int AS value
    FROM union_events
    GROUP BY ts
    ORDER BY ts
  `

  const stepMs = bucketSeconds * 1000
  const buckets = enumerateBuckets(start, end, stepMs)
  const valueMap = new Map(rows.map(r => [formatBucketLabel(r.ts, true), r.value]))
  const users = buckets.map(b => ({ time: b.key, value: valueMap.get(b.key) ?? 0 }))
  return users
}

/** Returns cost breakdown by model */
async function getCostByModel(start: Date): Promise<ModelCost[]> {
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

/** Renders dashboard home page */
export default async function HomePage() {
  const { start, end } = getLastWeek()

  const [top, series, byModel, users] = await Promise.all([
    getTopMetrics(start),
    getTimeSeries(start, end, 3),
    getCostByModel(start),
    getUsersSeries(start, end, 12),
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

