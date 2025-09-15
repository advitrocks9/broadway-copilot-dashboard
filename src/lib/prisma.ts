import { PrismaClient } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { withAccelerate } from '@prisma/extension-accelerate'

const prismaClientSingleton = () => {
  return new PrismaClient().$extends(withAccelerate())
}

const prismaEdgeClientSingleton = () => {
    return new PrismaClientEdge().$extends(withAccelerate())
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>
type PrismaEdgeClientSingleton = ReturnType<typeof prismaEdgeClientSingleton>

declare global {
  var prismaGlobal: undefined | PrismaClientSingleton
  var prismaEdgeGlobal: undefined | PrismaEdgeClientSingleton
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()
const prismaEdge = globalThis.prismaEdgeGlobal ?? prismaEdgeClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
  globalThis.prismaEdgeGlobal = prismaEdge
}

export { prisma, prismaEdge };
export default prisma;