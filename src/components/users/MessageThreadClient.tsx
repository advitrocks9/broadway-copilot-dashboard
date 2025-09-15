"use client"

import * as React from "react"
import Image from "next/image"

type MessageContent = { type?: string; text?: string; url?: string } | string

export function MessageThreadClient({ userId }: { userId: string }) {
  const [messages, setMessages] = React.useState<Array<{ id: string; role: string; content: MessageContent[]; createdAt: string }>>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/users/messages?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data: { messages?: Array<{ id: string; role: string; content: MessageContent[]; createdAt: string }> }) => {
        if (!active) return
        setMessages(data?.messages ?? [])
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [userId])

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-3 py-3">
      {messages.map((m) => (
        <div key={m.id} className={m.role === "USER" ? "flex justify-start" : "flex justify-end"}>
          <div className={"max-w-[75%] rounded-lg px-3 py-2 text-sm " + (m.role === "USER" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground")}>
            {m.content.map((c: MessageContent, i: number) => {
              if (typeof c === "string") return <p key={i} className="whitespace-pre-wrap">{c}</p>
              if (c?.type === "text") return <p key={i} className="whitespace-pre-wrap">{c.text}</p>
              if (c?.type === "image" && c.url) return <Image key={i} src={c.url} alt="image" width={320} height={240} className="mt-2 rounded-md h-auto w-auto" />
              return <pre key={i} className="text-xs whitespace-pre-wrap">{JSON.stringify(c)}</pre>
            })}
            <div className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}


