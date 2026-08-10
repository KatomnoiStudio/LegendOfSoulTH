import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

interface NormalizedStatement {
  line: number
  normalized: string
  text: string
}

interface MigrationViolation {
  file: string
  line: number
  statement: string
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations')
const PVP_MIGRATION = '20260809064000_p12_private_pvp_rooms.sql'
const CREATE_PREFIX = String.raw`(?:or\s+replace\s+)?(?:(?:constraint|global|local|temp|temporary|unique|unlogged)\s+)*`
const OBJECT_TYPE = String.raw`(?:aggregate|collation|conversion|domain|foreign\s+table|function|index|materialized\s+view|operator|procedure|sequence|table|trigger|type|view)`
const TARGET_PREFIX = String.raw`(?:concurrently\s+)?(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?`
const MANAGED_OBJECT_DDL = [
  new RegExp(`^create\\s+${CREATE_PREFIX}${OBJECT_TYPE}\\s+${TARGET_PREFIX}realtime\\.`),
  new RegExp(`^alter\\s+${OBJECT_TYPE}\\s+${TARGET_PREFIX}realtime\\.`),
  new RegExp(`^drop\\s+${OBJECT_TYPE}\\s+${TARGET_PREFIX}realtime\\.`),
  new RegExp(
    `^(?:create\\s+${CREATE_PREFIX}(?:index|trigger)|(?:alter|drop)\\s+trigger)\\b.*\\bon\\s+(?:only\\s+)?realtime\\.`,
  ),
  /^(?:create|alter|drop)\s+schema\b.*\brealtime\b/,
]

function countNewlines(value: string): number {
  return value.split('\n').length - 1
}

function dollarQuoteTagAt(sql: string, index: number): string | null {
  return /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index))?.[0] ?? null
}

function skipQuoted(sql: string, start: number, quote: "'" | '"'): number {
  let index = start + 1
  while (index < sql.length) {
    if (sql[index] === quote) {
      if (sql[index + 1] === quote) {
        index += 2
        continue
      }
      return index + 1
    }
    if (quote === "'" && sql[index] === '\\' && index + 1 < sql.length) {
      index += 2
      continue
    }
    index += 1
  }
  return index
}

function skipBlockComment(sql: string, start: number): number {
  let depth = 1
  let index = start + 2
  while (index < sql.length && depth > 0) {
    if (sql.startsWith('/*', index)) {
      depth += 1
      index += 2
    } else if (sql.startsWith('*/', index)) {
      depth -= 1
      index += 2
    } else {
      index += 1
    }
  }
  return index
}

function maskRange(masked: string[], sql: string, start: number, end: number): void {
  for (let index = start; index < end; index += 1) {
    if (sql[index] !== '\n') masked[index] = ' '
  }
}

function maskNonDdlSql(sql: string): string {
  const masked = sql.split('')
  let index = 0

  while (index < sql.length) {
    let end: number | null = null
    if (sql.startsWith('--', index)) {
      const newline = sql.indexOf('\n', index + 2)
      end = newline === -1 ? sql.length : newline
    } else if (sql.startsWith('/*', index)) {
      end = skipBlockComment(sql, index)
    } else if (sql[index] === "'") {
      end = skipQuoted(sql, index, "'")
    } else if (sql[index] === '$') {
      const tag = dollarQuoteTagAt(sql, index)
      if (tag) {
        const close = sql.indexOf(tag, index + tag.length)
        end = close === -1 ? sql.length : close + tag.length
      }
    } else if (sql[index] === '"') {
      const quotedEnd = skipQuoted(sql, index, '"')
      for (let cursor = index; cursor < quotedEnd; cursor += 1) {
        if (sql[cursor] === ';') masked[cursor] = ' '
      }
      index = quotedEnd
      continue
    }

    if (end !== null) {
      maskRange(masked, sql, index, end)
      index = end
    } else {
      index += 1
    }
  }
  return masked.join('')
}

function normalizeStatement(masked: string): string {
  return masked
    .replace(/"((?:""|[^"])*)"/g, (_match, identifier: string) => identifier.replaceAll('""', '"'))
    .toLowerCase()
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseStatements(sql: string): NormalizedStatement[] {
  const masked = maskNonDdlSql(sql)
  const statements: NormalizedStatement[] = []
  let line = 1
  let start = 0

  const addStatement = (end: number): void => {
    const maskedSlice = masked.slice(start, end)
    const firstToken = maskedSlice.search(/\S/)
    if (firstToken !== -1) {
      statements.push({
        line: line + countNewlines(maskedSlice.slice(0, firstToken)),
        normalized: normalizeStatement(maskedSlice),
        text: sql
          .slice(start + firstToken, end)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 240),
      })
    }
    line += countNewlines(maskedSlice)
    start = end
  }

  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === ';') addStatement(index + 1)
  }
  addStatement(masked.length)
  return statements
}

function isManagedRealtimeObjectDdl(statement: string): boolean {
  if (/^(?:create|alter|drop)\s+policy\b/.test(statement)) return false
  return MANAGED_OBJECT_DDL.some((pattern) => pattern.test(statement))
}

function findManagedRealtimeViolations(sql: string, file: string): MigrationViolation[] {
  return parseStatements(sql).flatMap(({ line, normalized, text }) =>
    isManagedRealtimeObjectDdl(normalized) ? [{ file, line, statement: text }] : [],
  )
}

function listMigrationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return listMigrationFiles(path)
      return entry.isFile() && entry.name.endsWith('.sql') ? [path] : []
    })
    .toSorted()
}

describe('Supabase migration managed-schema contract', () => {
  it('keeps every project migration policy-only in the managed Realtime schema', () => {
    const violations = listMigrationFiles(MIGRATIONS_DIR).flatMap((path) =>
      findManagedRealtimeViolations(
        readFileSync(path, 'utf8'),
        relative(process.cwd(), path).replaceAll('\\', '/'),
      ),
    )

    expect(
      violations.map(
        ({ file, line, statement }) => `${file}:${line}: managed Realtime DDL: ${statement}`,
      ),
    ).toEqual([])
  })

  it.each([
    ['ALTER TABLE ONLY', 'select 1; ALTER TABLE ONLY realtime.messages enable row level security;'],
    ['CREATE UNLOGGED TABLE', 'CREATE UNLOGGED TABLE realtime.audit_log (id bigint);'],
    [
      'quoted CREATE INDEX target',
      'CREATE INDEX realtime_messages_topic_idx ON "realtime" . "messages" (topic);',
    ],
    ['same-line DROP', 'select 1; drop function realtime.topic();'],
  ])('rejects the %s managed-object variant with file and line attribution', (_name, sql) => {
    const violations = findManagedRealtimeViolations(sql, 'gate-example.sql')

    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ file: 'gate-example.sql', line: 1 })
  })

  it.each([
    [
      'policy DDL with quoted helpers',
      `drop policy if exists "receive broadcast" on "realtime" . "messages";
       create policy "receive broadcast" on "realtime" . "messages"
       for select using ((select "realtime" . "topic"()) = 'pvp:room');`,
    ],
    [
      'public helper referencing Realtime',
      `create function public.current_realtime_topic() returns text language sql stable
       as $$ select "realtime" . "topic"() $$;`,
    ],
  ])('allows supported %s', (_name, sql) => {
    expect(findManagedRealtimeViolations(sql, 'allowed.sql')).toEqual([])
  })

  it('preserves the participant-only policy DDL in the P12 migration', () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, PVP_MIGRATION), 'utf8')
    expect(sql).toMatch(
      /drop policy if exists "pvp participants receive authority broadcast" on realtime\.messages/i,
    )
    expect(sql).toMatch(
      /create policy "pvp participants receive authority broadcast"\s+on realtime\.messages/i,
    )
  })
})
