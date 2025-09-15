"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

export function RangeTabs({ initial }: { initial: "24h" | "7d" | "30d" }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [range, setRange] = React.useState<"24h" | "7d" | "30d">(initial)

  function onChange(next: string) {
    const value = (next as "24h" | "7d" | "30d")
    setRange(value)
    const sp = new URLSearchParams(params.toString())
    sp.set("range", value)
    router.push(`${pathname}?${sp.toString()}`)
  }

  return (
    <Tabs value={range} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="24h">24h</TabsTrigger>
        <TabsTrigger value="7d">7d</TabsTrigger>
        <TabsTrigger value="30d">30d</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}


