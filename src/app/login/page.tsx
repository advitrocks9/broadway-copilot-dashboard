import { signIn, signOut } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          onGoogle={async () => {
            "use server"
            const result = await signIn("google", { redirectTo: "/?status=signed_in" })
            return result
          }}
          onMagicLink={async (formData: FormData) => {
            "use server"
            const email = formData.get("email") as string
            const result = await signIn("nodemailer", formData, { redirectTo: "/login?status=magic_sent" })
            return result
          }}
          onSignOut={async () => {
            "use server"
            const result = await signOut({ redirectTo: "/login?status=signed_out" })
            return result
          }}
        />
      </div>
    </div>
  )
}
