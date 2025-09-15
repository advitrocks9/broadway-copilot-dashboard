"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

type MagicLinkFormProps = {
  action: (formData: FormData) => Promise<void>
}

export function MagicLinkForm({ action }: MagicLinkFormProps) {
  const params = useSearchParams()

  useEffect(() => {
    // Toasts now handled globally by ToastController
  }, [params])

  return (
    <form
      action={action}
      onSubmit={() => {
        try {
          window.dispatchEvent(
            new CustomEvent("app:toast", { detail: { type: "message", message: "Sending magic link…" } })
          )
        } catch {}
      }}
      className="space-y-3"
    >
      <label htmlFor="email" className="text-sm">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        required
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <Button type="submit" className="w-full">Send magic link</Button>
    </form>
  )
}



