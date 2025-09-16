import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/** Fetches messages for a user */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response(null, { status: 401 })
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || ""
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 })
  const conv = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!conv) return Response.json({ messages: [] })
  const messages = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  })
  return Response.json({ messages })
}


