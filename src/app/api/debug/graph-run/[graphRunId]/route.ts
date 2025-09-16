import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { graphRunId: string } }
) {
  const { graphRunId } = params

  if (!graphRunId) {
    return NextResponse.json(
      { error: "graphRunId is required" },
      { status: 400 }
    )
  }

  try {
    const graphRun = await prisma.graphRun.findUnique({
      where: {
        id: graphRunId,
      },
      include: {
        nodeRuns: {
          include: {
            llmTraces: true,
          },
          orderBy: {
            startTime: "asc",
          },
        },
      },
    })

    if (!graphRun) {
      return NextResponse.json({ error: "GraphRun not found" }, { status: 404 })
    }

    return NextResponse.json(graphRun)
  } catch (error) {
    console.error("Failed to fetch graph run:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
