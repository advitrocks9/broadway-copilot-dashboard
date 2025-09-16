import { signIn } from "@/lib/auth"
import { LoginForm } from "@/components/global/login-form"

/** Renders login page */
export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          onGoogle={async () => {
            "use server"
            await signIn("google", { redirectTo: "/?status=signed_in" })
          }}
        />
      </div>
    </div>
  )
}
