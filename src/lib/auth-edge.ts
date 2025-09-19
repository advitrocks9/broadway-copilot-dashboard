import NextAuth from "next-auth"
import { PrismaAdapter } from "@/lib/prisma-auth-adapter"
import { prismaEdge } from "@/lib/prisma"

export const { auth } = NextAuth({
  adapter: PrismaAdapter(prismaEdge),
  session: { strategy: "database" },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [],
  logger: undefined,
})
