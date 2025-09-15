import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DebugTable } from "@/components/debug/DebugTable"
import { DebugFilters, Status } from "@/components/debug/DebugFilters"

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
  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 py-[22px] lg:px-6 lg:py-[24px]">
        <DebugFilters initial={{ user, status: statusForFilters, range }} />
      </div>

      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Graph runs</CardTitle>
        </CardHeader>
        <CardContent>
          <DebugTable rows={runs.map(r => ({
            id: r.id,
            startTime: r.startTime.toISOString(),
            user: r.user.profileName || r.user.whatsappId,
            status: r.status,
            durationMs: r.durationMs ?? null,
            tokens: r.llmTraces.reduce((sum, t) => sum + (t.totalTokens || 0), 0),
            firstUserMsg: String((r.initialState && (r.initialState as { input?: { Body?: string } }).input?.Body) || ""),
            traces: r.llmTraces.map(t => ({
              id: t.id,
              startTime: t.startTime?.toISOString() ?? null,
              durationMs: t.durationMs ?? null,
              model: t.model,
              totalTokens: t.totalTokens ?? null,
              inputMessages: t.inputMessages,
              outputMessage: t.outputMessage,
            })),
            errorTrace: r.errorTrace ?? null,
          }))} />
        </CardContent>
      </Card>
    </div>
  )
}
