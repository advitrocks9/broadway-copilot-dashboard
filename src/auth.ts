import NextAuth from "next-auth"
import { PrismaAdapter } from "@/lib/prisma-auth-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"
import NodeMailer from "next-auth/providers/nodemailer"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login", // ToastController reads error param
    verifyRequest: "/login?status=magic_sent",
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    NodeMailer({
      server: {
        host: "smtp.gmail.com",
        port: 465,
        auth: {
             user: process.env.GMAIL_USER,
             pass: process.env.GMAIL_PASS,
        },
      },
      from: process.env.GMAIL_USER,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false
      const allowed = await prisma.adminWhitelist.findUnique({
        where: { email: user.email },
      })
      return true
    },
    async session({ session, user }) {
      if (session.user && user) {
        ;(session.user as typeof session.user & { id: string }).id = user.id
        session.user.email = user.email ?? session.user.email
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl)
        const pathname = target.pathname
        if (pathname.startsWith("/api/auth/verify-request")) {
          return `${baseUrl}/login?status=magic_sent`
        }
        if (pathname.startsWith("/api/auth/error")) {
          const err = target.searchParams.get("error")
          return err ? `${baseUrl}/login?error=${encodeURIComponent(err)}` : `${baseUrl}/login`
        }
        if (url.startsWith("/")) return `${baseUrl}${url}`
        if (target.origin === baseUrl) return target.toString()
      } catch (_) {}
      return baseUrl
    },
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(error) {
      console.error("NextAuth Error:", error)
      console.log(error.cause)
    },
  },
})
