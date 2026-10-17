// Raw SQL database client — uses @libsql/client directly (no Prisma adapter needed)
// Mimics Prisma's API so API routes don't need to change
import { createClient } from '@libsql/client'
import { randomUUID } from 'crypto'

const TURSO_URL = 'libsql://learnx-ai-iam-x-x.aws-eu-west-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwODk0NjYsImlkIjoiMDFhMTQwZDctOTUwMS03MWYzLWE5YmItZWZkMmJmOGFlMDYyIiwia2lkIjoiY251dUlnd2ZrVERKSDRQWkVKVjdza25ZeDNfWGtZR0NqampUMGF0OEQtQSIsInJpZCI6IjI1NzMxYmFjLTY1MTktNDNjZi1hYTRiLTJlZGNmMWI4Y2JkMSJ9.vIeszM4TxCPraarsbjL15MRq3BrcytaXb5ZV0hECfEgTLiohf5K1pEJsQhBUGXkcC8NCSrPGTnVAcl7aVWICDA'

function getClient() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('file:')) {
    return createClient({ url: dbUrl })
  }
  return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
}

const client = getClient()

// Generate a CUID-like ID
function generateId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Convert a row (object with column names) to a typed object
function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    // Parse JSON fields
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try { obj[key] = JSON.parse(value) } catch { obj[key] = value }
    } else {
      obj[key] = value
    }
  }
  return obj
}

// Table wrapper that mimics Prisma model API
class TableDelegate {
  constructor(private tableName: string) {}

  async findMany(opts?: {
    where?: Record<string, unknown>
    select?: Record<string, boolean>
    include?: Record<string, boolean>
    orderBy?: Record<string, 'asc' | 'desc'>
    take?: number
    skip?: number
  }): Promise<Record<string, unknown>[]> {
    let sql = `SELECT * FROM "${this.tableName}"`
    const args: unknown[] = []
    const conditions: string[] = []

    if (opts?.where) {
      for (const [key, value] of Object.entries(opts.where)) {
        if (value === null) {
          conditions.push(`"${key}" IS NULL`)
        } else if (typeof value === 'object' && value !== null) {
          // Handle operators like { contains: "..." }
          const op = value as Record<string, unknown>
          if ('contains' in op) {
            conditions.push(`"${key}" LIKE ?`)
            args.push(`%${op.contains}%`)
          } else if ('in' in op && Array.isArray(op.in)) {
            if (op.in.length > 0) {
              const placeholders = op.in.map(() => '?').join(',')
              conditions.push(`"${key}" IN (${placeholders})`)
              args.push(...op.in)
            }
          } else if ('lte' in op) {
            conditions.push(`"${key}" <= ?`)
            args.push(op.lte)
          } else if ('gte' in op) {
            conditions.push(`"${key}" >= ?`)
            args.push(op.gte)
          }
        } else {
          conditions.push(`"${key}" = ?`)
          args.push(value)
        }
      }
    }

    // Handle OR conditions
    if (opts?.where && 'OR' in opts.where && Array.isArray(opts.where.OR)) {
      const orConditions = opts.where.OR.map((cond: Record<string, unknown>) => {
        const parts = Object.entries(cond).map(([key, val]) => {
          if (typeof val === 'string') {
            args.push(`%${val}%`)
            return `"${key}" LIKE ?`
          }
          return '1=1'
        })
        return `(${parts.join(' OR ')})`
      })
      conditions.push(`(${orConditions.join(' OR ')})`)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    if (opts?.orderBy) {
      const orderParts = Object.entries(opts.orderBy).map(([key, dir]) => `"${key}" ${dir.toUpperCase()}`)
      sql += ' ORDER BY ' + orderParts.join(', ')
    }

    if (opts?.take) sql += ` LIMIT ${opts.take}`
    if (opts?.skip) sql += ` OFFSET ${opts.skip}`

    const result = await client.execute({ sql, args })
    return result.rows.map(row => rowToObject(row as Record<string, unknown>))
  }

  async findUnique(opts: {
    where: Record<string, unknown>
    include?: Record<string, boolean>
    select?: Record<string, boolean>
  }): Promise<Record<string, unknown> | null> {
    const conditions: string[] = []
    const args: unknown[] = []
    for (const [key, value] of Object.entries(opts.where)) {
      conditions.push(`"${key}" = ?`)
      args.push(value)
    }
    const sql = `SELECT * FROM "${this.tableName}" WHERE ${conditions.join(' AND ')} LIMIT 1`
    const result = await client.execute({ sql, args })
    if (result.rows.length === 0) return null
    return rowToObject(result.rows[0] as Record<string, unknown>)
  }

  async findFirst(opts: {
    where?: Record<string, unknown>
    orderBy?: Record<string, 'asc' | 'desc'>
  }): Promise<Record<string, unknown> | null> {
    const results = await this.findMany({ ...opts, take: 1 })
    return results[0] || null
  }

  async create(opts: {
    data: Record<string, unknown>
    include?: Record<string, boolean>
    select?: Record<string, boolean>
  }): Promise<Record<string, unknown>> {
    const data = { ...opts.data }
    if (!data.id) data.id = generateId()
    if (!data.createdAt) data.createdAt = new Date().toISOString()
    if (!data.updatedAt) data.updatedAt = new Date().toISOString()

    const keys = Object.keys(data)
    const values = keys.map(k => {
      const v = data[k]
      if (v === null || v === undefined) return null
      if (typeof v === 'object') return JSON.stringify(v)
      if (v instanceof Date) return v.toISOString()
      if (typeof v === 'boolean') return v ? 1 : 0
      return v
    })
    const placeholders = keys.map(() => '?').join(',')
    const sql = `INSERT INTO "${this.tableName}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${placeholders}) RETURNING *`
    const result = await client.execute({ sql, args: values })
    return rowToObject(result.rows[0] as Record<string, unknown>)
  }

  async update(opts: {
    where: Record<string, unknown>
    data: Record<string, unknown>
    include?: Record<string, boolean>
    select?: Record<string, boolean>
  }): Promise<Record<string, unknown>> {
    const data = { ...opts.data, updatedAt: new Date().toISOString() }
    const setParts: string[] = []
    const args: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      setParts.push(`"${key}" = ?`)
      if (value === null || value === undefined) args.push(null)
      else if (typeof value === 'object') args.push(JSON.stringify(value))
      else if (value instanceof Date) args.push(value.toISOString())
      else if (typeof value === 'boolean') args.push(value ? 1 : 0)
      else args.push(value)
    }
    const whereParts: string[] = []
    for (const [key, value] of Object.entries(opts.where)) {
      whereParts.push(`"${key}" = ?`)
      args.push(value)
    }
    const sql = `UPDATE "${this.tableName}" SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')} RETURNING *`
    const result = await client.execute({ sql, args })
    return rowToObject(result.rows[0] as Record<string, unknown>)
  }

  async delete(opts: {
    where: Record<string, unknown>
  }): Promise<Record<string, unknown>> {
    const whereParts: string[] = []
    const args: unknown[] = []
    for (const [key, value] of Object.entries(opts.where)) {
      whereParts.push(`"${key}" = ?`)
      args.push(value)
    }
    const sql = `DELETE FROM "${this.tableName}" WHERE ${whereParts.join(' AND ')} RETURNING *`
    const result = await client.execute({ sql, args })
    return rowToObject(result.rows[0] as Record<string, unknown>)
  }

  async deleteMany(opts: {
    where?: Record<string, unknown>
  }): Promise<{ count: number }> {
    const args: unknown[] = []
    let sql = `DELETE FROM "${this.tableName}"`
    if (opts?.where) {
      const conditions: string[] = []
      for (const [key, value] of Object.entries(opts.where)) {
        conditions.push(`"${key}" = ?`)
        args.push(value)
      }
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    const result = await client.execute({ sql, args })
    return { count: result.rowsAffected || 0 }
  }

  async count(opts?: {
    where?: Record<string, unknown>
  }): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM "${this.tableName}"`
    const args: unknown[] = []
    if (opts?.where) {
      const conditions: string[] = []
      for (const [key, value] of Object.entries(opts.where)) {
        if (value === null) {
          conditions.push(`"${key}" IS NULL`)
        } else if (typeof value === 'object' && value !== null && 'lte' in value) {
          conditions.push(`"${key}" <= ?`)
          args.push((value as { lte: unknown }).lte)
        } else {
          conditions.push(`"${key}" = ?`)
          args.push(value)
        }
      }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    }
    const result = await client.execute({ sql, args })
    const row = result.rows[0] as Record<string, unknown>
    return Number(row?.count || 0)
  }

  async createMany(opts: {
    data: Record<string, unknown>[]
  }): Promise<{ count: number }> {
    let count = 0
    for (const item of opts.data) {
      const data = { ...item }
      if (!data.id) data.id = generateId()
      if (!data.createdAt) data.createdAt = new Date().toISOString()
      if (!data.updatedAt) data.updatedAt = new Date().toISOString()
      const keys = Object.keys(data)
      const values = keys.map(k => {
        const v = data[k]
        if (v === null || v === undefined) return null
        if (typeof v === 'object') return JSON.stringify(v)
        if (v instanceof Date) return v.toISOString()
        if (typeof v === 'boolean') return v ? 1 : 0
        return v
      })
      const placeholders = keys.map(() => '?').join(',')
      const sql = `INSERT INTO "${this.tableName}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${placeholders})`
      await client.execute({ sql, args: values })
      count++
    }
    return { count }
  }
}

// Export a Prisma-like client
export const db = {
  subject: new TableDelegate('Subject'),
  studySet: new TableDelegate('StudySet'),
  flashcard: new TableDelegate('Flashcard'),
  quiz: new TableDelegate('Quiz'),
  quizQuestion: new TableDelegate('QuizQuestion'),
  quizAttempt: new TableDelegate('QuizAttempt'),
  podcast: new TableDelegate('Podcast'),
  chatSession: new TableDelegate('ChatSession'),
  chatMessage: new TableDelegate('ChatMessage'),
  studyActivity: new TableDelegate('StudyActivity'),
  noteVersion: new TableDelegate('NoteVersion'),
  
  // Raw SQL escape hatch for complex queries
  $queryRaw: async (sql: string, args: unknown[] = []) => {
    const result = await client.execute({ sql, args })
    return result.rows
  },
  
  $executeRaw: async (sql: string, args: unknown[] = []) => {
    const result = await client.execute({ sql, args })
    return result.rowsAffected || 0
  },
}

// Export the raw client for direct use
export { client as rawClient }
