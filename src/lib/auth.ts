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
    verifyRequest: "/login",
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
    /** Handles user sign-in by checking whitelist */
    async signIn({ user }) {
      if (!user?.email) {
        return false
      }

      try {
        const allowed = await prisma.adminWhitelist.findUnique({
          where: { email: user.email },
        })
        if (allowed) {
          return true
        }
        return false
      } catch {
        return false
      }
    },
    /** Adds user ID to session object */
    async session({ session, user }) {
      if (session.user && user) {
        ;(session.user as typeof session.user & { id: string }).id = user.id
        session.user.email = user.email ?? session.user.email
      }
      return session
    },
    /** Handles authentication flow redirects */
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl)
        const pathname = target.pathname

        if (pathname.startsWith("/api/auth/callback")) {
          const redirectUrl = `${baseUrl}/?status=signed_in`
          return redirectUrl
        }
        if (pathname.startsWith("/api/auth/verify-request")) {
          const redirectUrl = `${baseUrl}/login?status=magic_sent`
          return redirectUrl
        }
        if (pathname.startsWith("/api/auth/error")) {
          const err = target.searchParams.get("error")
          const redirectUrl = err ? `${baseUrl}/login?error=${encodeURIComponent(err)}` : `${baseUrl}/login`
          return redirectUrl
        }
        if (url.startsWith("/")) {
          const redirectUrl = `${baseUrl}${url}`
          return redirectUrl
        }
        if (target.origin === baseUrl) {
          return target.toString()
        }
      } catch {
      }
      return baseUrl
    },
  },
})
