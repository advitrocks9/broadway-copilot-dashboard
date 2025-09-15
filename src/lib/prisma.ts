import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

if (!global.prisma) {
    global.prisma = new PrismaClient();
}
export default global.prisma;