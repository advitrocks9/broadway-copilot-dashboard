"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageThreadClient } from "@/components/users/MessageThreadClient"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function listWhitelistedUsers() {
  const whitelist = await prisma.userWhitelist.findMany()
  const users = await prisma.user.findMany({
    where: { whatsappId: { in: whitelist.map(w => w.waId) } },
    select: { id: true, whatsappId: true, createdAt: true },
  })

  const lastActive = await prisma.$queryRaw<{ userId: string; ts: Date }[]>`
    SELECT gr."userId", MAX(gr."startTime") AS ts
    FROM "GraphRun" gr
    GROUP BY gr."userId"
  `
  const userIds = users.map(u => u.id)
  const totals = userIds.length === 0 ? [] : await prisma.$queryRaw<{ userId: string; messages: number; cost: number }[]>`
    SELECT c."userId", COUNT(m.*)::int as messages, COALESCE(SUM(lt."costUsd"),0)::float as cost
    FROM "Conversation" c
    LEFT JOIN "Message" m ON m."conversationId" = c.id
    LEFT JOIN "GraphRun" gr ON gr."conversationId" = c.id
    LEFT JOIN "LLMTrace" lt ON lt."graphRunId" = gr.id
    WHERE c."userId" IN (${Prisma.join(userIds)})
    GROUP BY c."userId"
  `

  const lastMap = new Map(lastActive.map(r => [r.userId, r.ts]))
  const totalMap = new Map(totals.map(r => [r.userId, { messages: r.messages, cost: r.cost }]))

  return users.map(u => ({
    id: u.id,
    waId: u.whatsappId,
    createdAt: u.createdAt,
    lastActive: lastMap.get(u.id) ?? null,
    messages: totalMap.get(u.id)?.messages ?? 0,
    cost: totalMap.get(u.id)?.cost ?? 0,
  }))
}

// Messages fetched on client via /api/users/messages

async function addToWhitelist(formData: FormData) {
  "use server"
  const waId = String(formData.get("waId") || "").trim()
  if (!waId) return
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/users/whitelist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ waId }),
  })
  if (res.ok) {
    revalidatePath("/users")
    redirect("/users?status=whitelist_added")
  }
  if (res.status === 409) {
    revalidatePath("/users")
    redirect("/users?status=whitelist_exists")
  }
  const data = await res.json().catch(() => ({} as any)) as { error?: string }
  redirect(`/users?status=whitelist_add_failed&reason=${encodeURIComponent(data?.error || "")}`)
}

async function removeFromWhitelist(waId: string) {
  "use server"
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/users/whitelist?waId=${encodeURIComponent(waId)}`, { method: "DELETE" })
  if (res.status === 204) {
    revalidatePath("/users")
    redirect("/users?status=whitelist_removed")
  }
  const data = await res.json().catch(() => ({} as any)) as { error?: string }
  revalidatePath("/users")
  redirect(`/users?status=whitelist_remove_failed&reason=${encodeURIComponent(data?.error || "")}`)
}

export default async function UsersPage() {
  const rows = await listWhitelistedUsers()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users (whitelisted only)</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add to whitelist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to whitelist</DialogTitle>
            </DialogHeader>
            <form action={addToWhitelist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waId">waId</Label>
                <Input id="waId" name="waId" placeholder="+911234567890" required />
              </div>
              <DialogFooter>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Whitelisted Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifier</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Total messages</TableHead>
                <TableHead>Total cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.waId}</TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.lastActive ? new Date(r.lastActive).toLocaleString() : "-"}</TableCell>
                  <TableCell>{r.messages}</TableCell>
                  <TableCell>${r.cost.toFixed(4)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <form action={async () => { "use server"; await removeFromWhitelist(r.waId) }} className="inline">
                      <Button type="submit" variant="outline">Remove</Button>
                    </form>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost">View details</Button>
                      </SheetTrigger>
                      <SheetContent className="w-[560px] sm:max-w-[640px] overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>Conversation with {r.waId}</SheetTitle>
                        </SheetHeader>
                        <MessageThreadClient userId={r.id} />
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
