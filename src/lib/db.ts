import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  // If it's a Turso/libSQL URL, use the adapter
  if (dbUrl.startsWith('libsql://')) {
    // Parse manually — new URL() doesn't support libsql:// protocol
    const [baseUrl, queryString] = dbUrl.split('?')
    let authToken: string | undefined
    if (queryString) {
      const params = new URLSearchParams(queryString)
      authToken = params.get('authToken') || undefined
    }
    const libsql = createClient({ url: baseUrl, authToken })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Otherwise use regular SQLite (local dev)
  return new PrismaClient({
    log: ['query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
