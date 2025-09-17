"use server"

import { prisma } from "@/lib/prisma"
import { Prisma, Gender, AgeGroup } from "@prisma/client"
import { DataTable } from "@/components/users/user-table"
import { formatDistanceToNow } from "date-fns"

type UserRow = {
  id: string
  waId: string
  createdAt: Date | null
  profileName?: string | null
  inferredGender?: Gender | null
  inferredAgeGroup?: AgeGroup | null
  confirmedGender?: Gender | null
  confirmedAgeGroup?: AgeGroup | null
  lastActive: Date | null
  messages: number
  tokens: number
  cost: number
}

/** Lists whitelisted users with activity data */
async function listWhitelistedUsers(): Promise<UserRow[]> {
  const whitelist = await prisma.userWhitelist.findMany()
  const users = await prisma.user.findMany({
    where: { whatsappId: { in: whitelist.map((w) => w.waId) } },
    select: {
      id: true,
      whatsappId: true,
      createdAt: true,
      profileName: true,
      inferredGender: true,
      inferredAgeGroup: true,
      confirmedGender: true,
      confirmedAgeGroup: true,
    },
  })

  const lastActive = await prisma.$queryRaw<
    { userId: string; ts: Date }[]
  >`
    SELECT gr."userId", MAX(gr."startTime") AS ts
    FROM "GraphRun" gr
    GROUP BY gr."userId"
  `
  const userIds = users.map(u => u.id)
  
  const messageCounts = userIds.length === 0 ? [] : await prisma.$queryRaw<{ userId: string; messages: number }[]>`
    SELECT c."userId",
      COUNT(m.id)::int as messages
    FROM "Conversation" c
    LEFT JOIN "Message" m ON m."conversationId" = c.id
    WHERE c."userId" IN (${Prisma.join(userIds)})
    GROUP BY c."userId"
  `
  
  const tokenCosts = userIds.length === 0 ? [] : await prisma.$queryRaw<{ userId: string; tokens: number; cost: number }[]>`
    SELECT c."userId",
      COALESCE(SUM(lt."totalTokens"),0)::int as tokens,
      COALESCE(SUM(lt."costUsd"),0)::float as cost
    FROM "Conversation" c
    LEFT JOIN "GraphRun" gr ON gr."conversationId" = c.id
    LEFT JOIN "NodeRun" nr ON nr."graphRunId" = gr.id
    LEFT JOIN "LLMTrace" lt ON lt."nodeRunId" = nr.id
    WHERE c."userId" IN (${Prisma.join(userIds)})
    GROUP BY c."userId"
  `

  const lastMap = new Map(lastActive.map(r => [r.userId, r.ts]))
  const messageMap = new Map(messageCounts.map(r => [r.userId, r.messages]))
  const tokenCostMap = new Map(tokenCosts.map(r => [r.userId, { tokens: r.tokens, cost: r.cost }]))

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    waId: u.whatsappId,
    createdAt: u.createdAt,
    profileName: u.profileName,
    inferredGender: u.inferredGender,
    inferredAgeGroup: u.inferredAgeGroup,
    confirmedGender: u.confirmedGender,
    confirmedAgeGroup: u.confirmedAgeGroup,
    lastActive: lastMap.get(u.id) ?? null,
    messages: messageMap.get(u.id) ?? 0,
    tokens: tokenCostMap.get(u.id)?.tokens ?? 0,
    cost: tokenCostMap.get(u.id)?.cost ?? 0,
  }))

  const userWaIds = new Set(users.map((u) => u.whatsappId))
  const missing: UserRow[] = whitelist
    .filter((w) => !userWaIds.has(w.waId))
    .map((w) => ({
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

function formatGender(gender: Gender | null | undefined): string {
  if (!gender) return "—"
  switch (gender) {
    case "MALE":
      return "Male"
    case "FEMALE":
      return "Female"
    default:
      return "—"
  }
}

function formatAgeGroup(ageGroup: AgeGroup | null | undefined): string {
  if (!ageGroup) return "—"
  return ageGroup.replace("AGE_", "").replace("_PLUS", "+").replace("_", "-")
}

/** Renders users page */
export default async function UsersPage() {
  const rows = await listWhitelistedUsers()
  const tableData = rows.map((u) => {
    const gender = u.confirmedGender || u.inferredGender
    const ageGroup = u.confirmedAgeGroup || u.inferredAgeGroup
    return {
      id: u.id,
      phoneNumber: u.waId,
      name: u.profileName ?? "",
      gender: formatGender(gender),
      ageGroup: formatAgeGroup(ageGroup),
      lastActive: u.lastActive
        ? `${formatDistanceToNow(new Date(u.lastActive))} ago`
        : "—",
      totalMessages: String(u.messages ?? 0),
      totalTokens: String(u.tokens ?? 0),
    }
  })
  return (
    <div className="flex flex-col gap-4 ">
      <div className="flex items-center justify-between px-4 py-[22px] lg:px-6 lg:py-[24px]">
        <h1 className="text-4xl font-semibold">Users</h1>
        
      </div>

      <DataTable data={tableData} />
    </div>
  )
}
