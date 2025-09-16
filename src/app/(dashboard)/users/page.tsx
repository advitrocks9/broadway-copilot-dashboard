"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { DataTable } from "@/components/users/user-table"
import { formatDistanceToNow } from "date-fns"

type UserRow = {
  id: string
  waId: string
  createdAt: Date | null
  profileName?: string | null
  lastActive: Date | null
  messages: number
  tokens: number
  cost: number
}

/** Lists whitelisted users with activity data */
async function listWhitelistedUsers(): Promise<UserRow[]> {
  const whitelist = await prisma.userWhitelist.findMany()
  const users = await prisma.user.findMany({
    where: { whatsappId: { in: whitelist.map(w => w.waId) } },
    select: { id: true, whatsappId: true, createdAt: true, profileName: true },
  })

  const lastActive = await prisma.$queryRaw<{ userId: string; ts: Date }[]>`
    SELECT gr."userId", MAX(gr."startTime") AS ts
    FROM "GraphRun" gr
    GROUP BY gr."userId"
  `
  const userIds = users.map(u => u.id)
  const totals = userIds.length === 0 ? [] : await prisma.$queryRaw<{ userId: string; messages: number; tokens: number; cost: number }[]>`
    SELECT c."userId",
      COUNT(m.*)::int as messages,
      COALESCE(SUM(lt."totalTokens"),0)::int as tokens,
      COALESCE(SUM(lt."costUsd"),0)::float as cost
    FROM "Conversation" c
    LEFT JOIN "Message" m ON m."conversationId" = c.id
    LEFT JOIN "GraphRun" gr ON gr."conversationId" = c.id
    LEFT JOIN "LLMTrace" lt ON lt."graphRunId" = gr.id
    WHERE c."userId" IN (${Prisma.join(userIds)})
    GROUP BY c."userId"
  `

  const lastMap = new Map(lastActive.map(r => [r.userId, r.ts]))
  const totalMap = new Map(
    totals.map(r => [r.userId, { messages: r.messages, tokens: r.tokens, cost: r.cost }])
  )

  const userRows: UserRow[] = users.map(u => ({
    id: u.id,
    waId: u.whatsappId,
    createdAt: u.createdAt,
    profileName: u.profileName,
    lastActive: lastMap.get(u.id) ?? null,
    messages: totalMap.get(u.id)?.messages ?? 0,
    tokens: totalMap.get(u.id)?.tokens ?? 0,
    cost: totalMap.get(u.id)?.cost ?? 0,
  }))

  const userWaIds = new Set(users.map(u => u.whatsappId))
  const missing: UserRow[] = whitelist
    .filter(w => !userWaIds.has(w.waId))
    .map(w => ({
      id: `whitelist:${w.id}`,
      waId: w.waId,
      createdAt: null,
      lastActive: null,
      messages: 0,
      tokens: 0,
      cost: 0,
    }))

  return [...userRows, ...missing]
}

// Messages fetched on client via /api/users/messages

/** Renders users page */
export default async function UsersPage() {
  const rows = await listWhitelistedUsers()
  const tableData = rows.map((u, idx) => ({
    id: idx + 1,
    phoneNumber: u.waId,
    name: u.profileName ?? "",
    lastActive: u.lastActive ? `${formatDistanceToNow(new Date(u.lastActive))} ago` : "—",
    totalMessages: String(u.messages ?? 0),
    totalTokens: String(u.tokens ?? 0),
  }))
  return (
    <div className="flex flex-col gap-4 ">
      <div className="flex items-center justify-between px-4 py-[22px] lg:px-6 lg:py-[24px]">
        <h1 className="text-4xl font-semibold">Users</h1>
        
      </div>

      <DataTable data={tableData} />
    </div>
  )
}
