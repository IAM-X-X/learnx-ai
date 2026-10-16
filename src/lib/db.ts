// Lazy database client — connects to Turso on first query, never crashes during build
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// Turso database connection
const TURSO_URL = 'libsql://learnx-ai-iam-x-x.aws-eu-west-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwODk0NjYsImlkIjoiMDFhMTQwZDctOTUwMS03MWYzLWE5YmItZWZkMmJmOGFlMDYyIiwia2lkIjoiY251dUlnd2ZrVERKSDRQWkVKVjdza25ZeDNfWGtZR0NqampUMGF0OEQtQSIsInJpZCI6IjI1NzMxYmFjLTY1MTktNDNjZi1hYTRiLTJlZGNmMWI4Y2JkMSJ9.vIeszM4TxCPraarsbjL15MRq3BrcytaXb5ZV0hECfEgTLiohf5K1pEJsQhBUGXkcC8NCSrPGTnVAcl7aVWICDA'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaInit: boolean | undefined
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

  // For Turso URLs (from env var or hardcoded)
  let url = TURSO_URL
  let token = TURSO_TOKEN

  if (dbUrl.startsWith('libsql://')) {
    const [baseUrl, queryString] = dbUrl.split('?')
    url = baseUrl
    if (queryString) {
      token = new URLSearchParams(queryString).get('authToken') || TURSO_TOKEN
    }
  }

  try {
    const libsql = createClient({ url, authToken: token })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  } catch (e) {
    console.error('[DB] Turso connection failed:', e)
    throw e
  }
}

function getDb(): PrismaClient {
  if (!globalForPrisma.prismaInit) {
    globalForPrisma.prisma = createPrismaClient()
    globalForPrisma.prismaInit = true
  }
  return globalForPrisma.prisma!
}

// Proxy: creates the client lazily on first property access — never during build
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = client[prop as keyof PrismaClient]
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
