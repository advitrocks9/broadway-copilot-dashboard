import NextAuth from "next-auth"
import { PrismaAdapter } from "@/lib/prisma-auth-adapter"
import { PrismaClient } from "@prisma/client"
import Google from "next-auth/providers/google"
import NodeMailer from "next-auth/providers/nodemailer"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
      if (process.env.NODE_ENV === "development") {
        return true
      }
      if (!user?.email) return false
      const allowed = await prisma.adminWhitelist.findUnique({
        where: { email: user.email },
      })
      return !!allowed
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(error) {
      console.error("NextAuth Error:", error)
    },
  },
})
