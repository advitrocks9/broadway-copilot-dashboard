import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response(null, { status: 401 })
  const body = await req.json().catch(() => null)
  const waId = typeof body?.waId === "string" ? body.waId.trim() : ""
  if (!waId) return Response.json({ error: "waId required" }, { status: 400 })
  try {
    const created = await prisma.userWhitelist.create({ data: { waId } })
    return Response.json({ id: created.id, waId: created.waId }, { status: 201 })
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return Response.json({ error: "Already whitelisted" }, { status: 409 })
    }
    return Response.json({ error: "Failed to add" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response(null, { status: 401 })
  const { searchParams } = new URL(req.url)
  const waId = searchParams.get("waId")?.trim() ?? ""
  if (!waId) return Response.json({ error: "waId required" }, { status: 400 })
  try {
    await prisma.userWhitelist.delete({ where: { waId } })
    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
}


