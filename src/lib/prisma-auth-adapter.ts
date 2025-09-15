import type { PrismaClient } from "@prisma/client"
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from "@auth/core/adapters"

export function PrismaAdapter(
  prisma: PrismaClient | ReturnType<PrismaClient["$extends"]>
): Adapter {
  const p = prisma as PrismaClient
  return {
    createUser: ({ id: _id, ...data }) => p.admins.create(stripUndefined(data)),
    getUser: (id) => p.admins.findUnique({ where: { id } }),
    getUserByEmail: (email) => p.admins.findUnique({ where: { email } }),
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await p.adminAccount.findFirst({
        where: { provider, providerAccountId },
        include: { admin: true },
      })
      return (account?.admin as AdapterUser) ?? null
    },
    updateUser: ({ id, ...data }) =>
      p.admins.update({
        where: { id },
        ...stripUndefined(data),
      }) as Promise<AdapterUser>,
    deleteUser: (id) =>
      p.admins.delete({ where: { id } }) as Promise<AdapterUser>,
    linkAccount: (data) =>
      p.adminAccount.create({ data }) as unknown as AdapterAccount,
    unlinkAccount: async ({ provider, providerAccountId }) => {
      await p.adminAccount.deleteMany({ where: { provider, providerAccountId } })
      return { provider, providerAccountId } as unknown as AdapterAccount
    },
    async getSessionAndUser(sessionToken) {
      const userAndSession = await p.adminSession.findUnique({
        where: { sessionToken },
        include: { admin: true },
      })
      if (!userAndSession) return null
      const { admin, ...session } = userAndSession
      return { user: admin, session } as { user: AdapterUser; session: AdapterSession }
    },
    createSession: (data) => p.adminSession.create(stripUndefined(data)),
    updateSession: (data) =>
      p.adminSession.update({
        where: { sessionToken: data.sessionToken },
        ...stripUndefined(data),
      }),
    deleteSession: (sessionToken) =>
      p.adminSession.delete({ where: { sessionToken } }),
    async createVerificationToken(data) {
      const verificationToken = await p.adminVerificationToken.create(
        stripUndefined(data)
      )
      if ("id" in verificationToken && verificationToken.id)
        delete verificationToken.id
      return verificationToken
    },
    async useVerificationToken(identifier_token) {
      try {
        const verificationToken = await p.adminVerificationToken.delete({
          where: { identifier_token },
        })
        if ("id" in verificationToken && verificationToken.id)
          delete verificationToken.id
        return verificationToken
      } catch (error: unknown) {
        // If token already used/deleted, just return null
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2025"
        )
          return null
        throw error
      }
    },
    async getAccount(providerAccountId, provider) {
      return p.adminAccount.findFirst({
        where: { providerAccountId, provider },
      }) as Promise<AdapterAccount | null>
    },
    async createAuthenticator(data) {
      return p.adminAuthenticator.create(stripUndefined(data))
    },
    async getAuthenticator(credentialID) {
      return p.adminAuthenticator.findUnique({
        where: { credentialID },
      })
    },
    async listAuthenticatorsByUserId(userId) {
      return p.adminAuthenticator.findMany({
        where: { userId },
      })
    },
    async updateAuthenticatorCounter(credentialID, counter) {
      return p.adminAuthenticator.update({
        where: { credentialID },
        data: { counter },
      })
    },
  }
}

function stripUndefined<T>(obj: T) {
  const data = {} as T
  for (const key in obj) if (obj[key] !== undefined) data[key] = obj[key]
  return { data }
}