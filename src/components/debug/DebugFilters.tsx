"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

export type Status = "ERROR" | "RUNNING" | "COMPLETED"

export function DebugFilters({ initial }: { initial: { user?: string; status?: Status | "ALL"; range: "24h" | "7d" | "30d" } }) {
  const router = useRouter()
  const params = useSearchParams()
  const [user, setUser] = React.useState(initial.user ?? "")
  const [status, setStatus] = React.useState<Status | "ALL">(initial.status ?? "ALL")
  const [range, setRange] = React.useState<"24h" | "7d" | "30d">(initial.range)

  function apply() {
    const sp = new URLSearchParams(params.toString())
    if (user) sp.set("user", user); else sp.delete("user")
    if (status && status !== "ALL") sp.set("status", status); else sp.delete("status")
    sp.set("range", range)
    router.push(`/debug?${sp.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Input placeholder="User (type phone)" className="w-60" value={user} onChange={(e)=>setUser(e.target.value)} />
      <Select value={status} onValueChange={(v: Status | "ALL")=> setStatus(v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="ERROR">Error</SelectItem>
          <SelectItem value="RUNNING">Running</SelectItem>
        </SelectContent>
      </Select>
      <Tabs value={range} onValueChange={(v: string)=> setRange(v as "24h" | "7d" | "30d")}>
        <TabsList>
          <TabsTrigger value="24h">24h</TabsTrigger>
          <TabsTrigger value="7d">7d</TabsTrigger>
          <TabsTrigger value="30d">30d</TabsTrigger>
        </TabsList>
      </Tabs>
      <Button variant="outline" onClick={apply}>Apply</Button>
    </div>
  )
}


