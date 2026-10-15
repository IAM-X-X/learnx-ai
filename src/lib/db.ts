// Lazy database client — only connects on first query, never crashes during build
/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaInit: boolean | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  try {
    // If it's a Turso/libSQL URL, use the adapter
    if (dbUrl.startsWith('libsql://')) {
      // Dynamic import so the adapter isn't loaded during build if not needed
      const { PrismaLibSql } = require('@prisma/adapter-libsql')
      const { createClient } = require('@libsql/client')

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

    // Local SQLite
    return new PrismaClient({
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
      datasources: { db: { url: dbUrl || 'file:./db/custom.db' } },
    })
  } catch (e) {
    console.error('[DB] Failed to create PrismaClient:', e)
    // Return a dummy client that won't crash the build
    // Real queries will fail, but the app will build and deploy
    return new PrismaClient({
      datasources: { db: { url: 'file:./db/custom.db' } },
    })
  }
}

function getDb(): PrismaClient {
  if (!globalForPrisma.prismaInit) {
    globalForPrisma.prisma = createPrismaClient()
    globalForPrisma.prismaInit = true
  }
  return globalForPrisma.prisma!
}

// Use a Proxy so the client is created lazily on first access
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = client[prop as keyof PrismaClient]
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
