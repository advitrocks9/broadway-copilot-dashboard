import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
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
      <DebugFilters initial={{ user, status: statusForFilters, range }} />

      <Card>
        <CardHeader>
          <CardTitle>Graph runs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started at</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Time (ms)</TableHead>
                <TableHead>User msg</TableHead>
                <TableHead>Assistant reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => {
                const tokens = r.llmTraces.reduce((sum, t) => sum + (t.totalTokens || 0), 0)
                const firstUserMsg = r.initialState && (r.initialState as { input?: { Body?: string } }).input?.Body
                // const firstAssistant = r.finalState && (r.finalState as Record<string, unknown>).assistantPreview
                return (
                  <TableRow key={r.id} className={r.status === "ERROR" ? "bg-red-50" : undefined}>
                    <TableCell>{new Date(r.startTime).toLocaleString()}</TableCell>
                    <TableCell>{r.user.profileName || r.user.whatsappId}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{tokens}</TableCell>
                    <TableCell>{r.durationMs ?? "-"}</TableCell>
                    <TableCell>{String(firstUserMsg || "").slice(0, 24)}</TableCell>
                    <TableCell>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" className="px-0 text-primary">View</Button>
                        </SheetTrigger>
                        <SheetContent className="w-[540px] sm:max-w-[640px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Run {r.id}</SheetTitle>
                          </SheetHeader>
                          <div className="space-y-4 py-2">
                            <div className="text-sm">Status: {r.status}</div>
                            <div className="text-sm">Duration: {r.durationMs ?? "-"} ms</div>
                            <div className="space-y-2">
                              {r.llmTraces.sort((a,b)=> (a.startTime?.getTime()||0)-(b.startTime?.getTime()||0)).map((t) => (
                                <Card key={t.id}>
                                  <CardHeader>
                                    <CardTitle className="text-sm font-medium">{t.model} · {t.totalTokens ?? 0} tok · {t.durationMs ?? 0} ms</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-xs whitespace-pre-wrap">Input: {JSON.stringify(t.inputMessages, null, 2)}</div>
                                    <div className="text-xs whitespace-pre-wrap mt-2">Output: {JSON.stringify(t.outputMessage ?? {}, null, 2)}</div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            {r.errorTrace ? (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm font-medium text-red-600">Error</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <pre className="text-xs whitespace-pre-wrap">{r.errorTrace}</pre>
                                </CardContent>
                              </Card>
                            ) : null}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
