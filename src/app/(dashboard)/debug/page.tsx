import { prisma } from "@/lib/prisma"
import { DataTable } from "@/components/debug/debug-table"
import { formatDistanceToNow } from "date-fns"

type LocalStatus = Status

async function listRuns(params: { status?: LocalStatus; user?: string; range?: "24h" | "7d" | "30d" }) {
  const now = new Date()
  const start = new Date(
    params?.range === "7d" ? now.getTime() - 7 * 86400000 : params?.range === "30d" ? now.getTime() - 30 * 86400000 : now.getTime() - 86400000
  )
  const where: Record<string, unknown> = { startTime: { gte: start } }
  if (params?.status === "ERROR") where.status = "ERROR"
  if (params?.status === "RUNNING") where.status = "RUNNING"
  if (params?.status === "COMPLETED") where.status = "COMPLETED"
  if (params?.user) where.user = { whatsappId: { contains: params.user } }

  const runs = await prisma.graphRun.findMany({
    where,
    orderBy: { startTime: "desc" },
    include: { user: true, llmTraces: true },
    take: 50,
  })
  return runs
}


export default async function DebugPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const user = typeof sp.user === "string" ? sp.user : undefined
  const statusParam = typeof sp.status === "string" ? sp.status : undefined
  const rangeParam = (typeof sp.range === "string" ? sp.range : undefined) as "24h" | "7d" | "30d" | undefined
  const status = statusParam && ["ERROR","RUNNING","COMPLETED"].includes(statusParam) ? (statusParam as LocalStatus) : undefined
  const range = rangeParam ?? "24h"
  const runs = await listRuns({ user, status, range })
  const statusForFilters: Status | "ALL" = (status as Status | undefined) ?? "ALL"

  const tableData = runs.map(run => {
    const totalTokens = run.llmTraces.reduce((acc, trace) => acc + (trace.totalTokens ?? 0), 0)
    const timeTaken = run.endTime ? (run.endTime.getTime() - run.startTime.getTime()) / 1000 : 0

    const initialState = run.initialState as any
    const userMessage = initialState?.input?.Body || "N/A"

    const lastTrace = run.llmTraces.at(-1)
    const outputMessage = lastTrace?.outputMessage as any
    const assistantReply = (outputMessage && typeof outputMessage.content === "string") ? outputMessage.content : "N/A"

    return {
      graphRunId: run.id,
      userphoneNumber: run.user.whatsappId,
      status: run.status,
      totalTokens: totalTokens.toString(),
      timeTaken: `${timeTaken.toFixed(1)}s`,
      startedAt: `${formatDistanceToNow(run.startTime)} ago`,
      userMessage,
      assistantReply,
    }
  })

  return (
    <div className="flex flex-col gap-4 ">
      <div className="flex items-center justify-between px-4 py-[22px] lg:px-6 lg:py-[24px]">
        <h1 className="text-4xl font-semibold">Debug</h1>
        
      </div>
      <DataTable data={tableData} />
    </div>
  )
}