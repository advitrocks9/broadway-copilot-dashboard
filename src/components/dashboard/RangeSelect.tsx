"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function RangeSelect({ initial }: { initial: "24h" | "7d" | "30d" }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  function onChange(value: string) {
    const sp = new URLSearchParams(params.toString())
    sp.set("range", value)
    router.push(`${pathname}?${sp.toString()}`)
  }
  return (
    <Select value={initial} onValueChange={onChange}>
      <SelectTrigger className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate" size="sm" aria-label="Select a range">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        <SelectItem value="24h" className="rounded-lg">Last 24h</SelectItem>
        <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
        <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
      </SelectContent>
    </Select>
  )
}


