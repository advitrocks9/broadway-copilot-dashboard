import { prisma } from "@/lib/prisma"
import { DataTable } from "@/components/debug/debug-table"
import { formatDistanceToNow } from "date-fns"

interface InitialState {
  input?: {
    Body?: string
  }
}


async function listRuns() {
  const now = new Date()
  const start = new Date(now.getTime() - 7 * 86400000)
  const where: Record<string, unknown> = { startTime: { gte: start } }

  const runs = await prisma.graphRun.findMany({
    where,
    orderBy: { startTime: "desc" },
    include: { user: true, nodeRuns: { include: { llmTraces: true } } },
    take: 50,
  })
  return runs
}

interface FinalState {
  assistantReply?: Array<{
    reply_type: string
    reply_text?: string
    media_url?: string
  }> | null
}

export default async function DebugPage() {
  const runs = await listRuns()

  const tableData = runs.map(run => {
    const allLlmTraces = run.nodeRuns.flatMap(nr => nr.llmTraces)
    const totalTokens = allLlmTraces.reduce(
      (acc, trace) => acc + (trace.totalTokens ?? 0),
      0
    )
    const timeTaken = run.endTime
      ? (run.endTime.getTime() - run.startTime.getTime()) / 1000
      : 0

    const initialState = run.initialState as InitialState
    const userMessage = initialState?.input?.Body || "N/A"

    const finalState = run.finalState as FinalState | undefined
    let assistantReply = "N/A"

    if (finalState?.assistantReply && Array.isArray(finalState.assistantReply)) {
      const textReplies = finalState.assistantReply
        .filter(reply => reply.reply_type === "text" && reply.reply_text)
        .map(reply => reply.reply_text)
        .join(" ")
      
      if (textReplies.trim()) {
        assistantReply = textReplies.trim()
      }
    }

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