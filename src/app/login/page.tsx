import { signIn, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { GoogleSignInForm } from "@/components/auth/GoogleSignInForm"
import { MagicLinkForm } from "@/components/auth/MagicLinkForm"

export default function LoginPage() {
  return (
    <html lang="en">
      <body className="min-h-svh bg-background text-foreground">
        <main className="flex min-h-svh items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-semibold">Sign in</h1>
              <p className="text-sm text-muted-foreground">Broadway Copilot Admin</p>
            </div>

            <GoogleSignInForm
              action={async () => {
                "use server"
                await signIn("google", { redirectTo: "/?status=signed_in" })
              }}
            />

            <div className="text-center text-xs text-muted-foreground">or</div>

            <MagicLinkForm
              action={async (formData) => {
                "use server"
                await signIn("nodemailer", formData, { redirectTo: "/login?status=magic_sent" })
              }}
            />

            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login?status=signed_out" })
              }}
            >
              <Button type="submit" variant="ghost" className="w-full">Sign out</Button>
            </form>

            <div className="text-center">
              <Link href="/" className="text-xs text-muted-foreground hover:underline">Back to home</Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
