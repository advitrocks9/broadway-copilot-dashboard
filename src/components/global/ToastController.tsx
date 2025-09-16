"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

/** Shows toast notifications based on status/error */
function showToastForStatus(status: string | null, error: string | null, reason: string | null) {
  if (status) {
    switch (status) {
      case "magic_sent":
        toast.success("Magic link sent. Check your email.")
        break
      case "signed_out":
        toast.success("Signed out.")
        break
      case "whitelist_added":
        toast.success("User added to whitelist.")
        break
      case "whitelist_exists":
        toast.message("User already whitelisted.")
        break
      case "whitelist_removed":
        toast.success("Removed from whitelist.")
        break
      case "whitelist_add_failed":
        toast.error(reason || "Failed to add to whitelist.")
        break
      case "whitelist_remove_failed":
        toast.error(reason || "Failed to remove from whitelist.")
        break
      case "magic_failed":
        toast.error(reason || "Failed to send magic link.")
        break
      case "signed_in":
        toast.success("Signed in successfully.")
        break
      case "link_expired":
        toast.error("This link is expired or invalid.")
        break
      default:
        break
    }
  }

  if (error) {
    if (error === "AccessDenied") {
      toast.error("You are not whitelisted. Contact an administrator.")
    } else if (error === "Verification" || error === "Expired") {
      toast.error("This link is expired or invalid.")
    } else {
      toast.error(reason || "Sign in failed. Please try again.")
    }
  }
}

/** Handles toast notifications from URL params */
export default function ToastController() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasShownRef = useRef<string>("")

  // Handle URL-driven toasts once, then clean URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    const status = sp.get("status")
    const error = sp.get("error")
    const reason = sp.get("reason")

    const key = `${pathname}|${status}|${error}|${reason}`
    if (key && hasShownRef.current !== key) {
      hasShownRef.current = key
      showToastForStatus(status, error, reason)
      if (status || error || reason) {
        if (status) sp.delete("status")
        if (error) sp.delete("error")
        if (reason) sp.delete("reason")
        const qs = sp.toString()
        const next = qs ? `${pathname}?${qs}` : pathname
        router.replace(next)
      }
    }
  }, [pathname, searchParams, router])

  // Central event bus: dispatch CustomEvent("app:toast", { detail: { type, message } })
  useEffect(() => {
    function onAppToast(e: Event) {
      const ev = e as CustomEvent<{ type?: "success" | "error" | "message"; message: string }>
      const type = ev.detail?.type || "message"
      const message = ev.detail?.message
      if (!message) return
      if (type === "success") toast.success(message)
      else if (type === "error") toast.error(message)
      else toast.message(message)
    }
    window.addEventListener("app:toast", onAppToast as EventListener)
    return () => window.removeEventListener("app:toast", onAppToast as EventListener)
  }, [])

  return null
}
