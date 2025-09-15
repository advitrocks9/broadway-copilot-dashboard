"use client"

import { Button } from "@/components/ui/button"

type GoogleSignInFormProps = {
  action: () => Promise<void>
}

export function GoogleSignInForm({ action }: GoogleSignInFormProps) {
  return (
    <form
      action={action}
      onSubmit={() => {
        try {
          window.dispatchEvent(
            new CustomEvent("app:toast", { detail: { type: "message", message: "Redirecting to Google sign in…" } })
          )
        } catch {}
      }}
    >
      <Button type="submit" className="w-full">Continue with Google</Button>
    </form>
  )
}



