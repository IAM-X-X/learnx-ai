// Lazy database client — connects to Turso on first query, never crashes during build
/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaClient } from '@prisma/client'

// Turso database connection — used as fallback when env var is not set
// (e.g. on Vercel when env vars aren't configured properly)
const TURSO_URL = 'libsql://learnx-ai-iam-x-x.aws-eu-west-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwODk0NjYsImlkIjoiMDFhMTQwZDctOTUwMS03MWYzLWE5YmItZWZkMmJmOGFlMDYyIiwia2lkIjoiY251dUlnd2ZrVERKSDRQWkVKVjdza25ZeDNfWGtZR0NqampUMGF0OEQtQSIsInJpZCI6IjI1NzMxYmFjLTY1MTktNDNjZi1hYTRiLTJlZGNmMWI4Y2JkMSJ9.vIeszM4TxCPraarsbjL15MRq3BrcytaXb5ZV0hECfEgTLiohf5K1pEJsQhBUGXkcC8NCSrPGTnVAcl7aVWICDA'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaInit: boolean | undefined
}

function createPrismaClient(): PrismaClient {
  // Use env var if available, otherwise use hardcoded Turso connection
  const dbUrl = process.env.DATABASE_URL || ''

  // Determine the actual URL and token to use
  let url = dbUrl
  let token: string | undefined

  if (dbUrl.startsWith('libsql://')) {
    // Parse the Turso URL from env var
    const [baseUrl, queryString] = dbUrl.split('?')
    url = baseUrl
    if (queryString) {
      token = new URLSearchParams(queryString).get('authToken') || undefined
    }
  } else if (dbUrl.startsWith('file:')) {
    // Local SQLite — use it directly
    return new PrismaClient({
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
      datasources: { db: { url: dbUrl } },
    })
  } else {
    // No valid env var — use hardcoded Turso connection
    url = TURSO_URL
    token = TURSO_TOKEN
  }

  try {
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')
    const libsql = createClient({ url, authToken: token })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  } catch (e) {
    console.error('[DB] Failed to create PrismaClient with Turso:', e)
    // Last resort — try local SQLite
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

// Proxy so the client is created lazily on first access — never during build
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = client[prop as keyof PrismaClient]
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
