import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  // Local SQLite for development
  if (dbUrl.startsWith('file:')) {
    return new PrismaClient({
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
      datasources: { db: { url: dbUrl } },
    })
  }

  // Turso cloud database — URL and token inlined directly (no consts to tree-shake)
  const libsql = createClient({
    url: 'libsql://learnx-ai-iam-x-x.aws-eu-west-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwODk0NjYsImlkIjoiMDFhMTQwZDctOTUwMS03MWYzLWE5YmItZWZkMmJmOGFlMDYyIiwia2lkIjoiY251dUlnd2ZrVERKSDRQWkVKVjdza25ZeDNfWGtZR0NqampUMGF0OEQtQSIsInJpZCI6IjI1NzMxYmFjLTY1MTktNDNjZi1hYTRiLTJlZGNmMWI4Y2JkMSJ9.vIeszM4TxCPraarsbjL15MRq3BrcytaXb5ZV0hECfEgTLiohf5K1pEJsQhBUGXkcC8NCSrPGTnVAcl7aVWICDA',
  })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
