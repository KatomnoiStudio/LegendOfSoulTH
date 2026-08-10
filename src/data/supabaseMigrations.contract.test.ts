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
// `policy` is deliberately absent from every pattern here: policies are the ONE kind of DDL a
// project migration may add to the platform-managed `realtime` schema. The "allows policy DDL"
// case below is the regression pin — widening these patterns to catch policy DDL turns it red.
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

// Newlines survive masking so a violation keeps its real line number even when a 600-line
// migration hides it behind block comments and dollar-quoted bodies.
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

function findManagedRealtimeViolations(sql: string, file: string): MigrationViolation[] {
  return parseStatements(sql).flatMap(({ line, normalized, text }) =>
    MANAGED_OBJECT_DDL.some((pattern) => pattern.test(normalized))
      ? [{ file, line, statement: text }]
      : [],
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
    [
      'ALTER TABLE ONLY',
      1,
      'select 1; ALTER TABLE ONLY realtime.messages enable row level security;',
    ],
    ['CREATE UNLOGGED TABLE', 1, 'CREATE UNLOGGED TABLE realtime.audit_log (id bigint);'],
    [
      'quoted CREATE INDEX target',
      1,
      'CREATE INDEX realtime_messages_topic_idx ON "realtime" . "messages" (topic);',
    ],
    ['same-line DROP', 1, 'select 1; drop function realtime.topic();'],
    // The real migrations are 600+ lines of block comments and dollar-quoted bodies full of
    // semicolons. A violation buried under them must still report its own line, or the reviewer
    // opens line 1, finds a header comment, and stops trusting this gate.
    [
      'violation buried under a block comment and a dollar-quoted body',
      8,
      `/* Managed-schema notes:
   realtime.messages is platform-owned; only policies may be added.
   Semicolons in here (;;;) must not split statements. */
create or replace function public.pvp_topic() returns text
language sql stable as $fn$
  select current_setting('realtime.topic', true); -- ; inside a dollar-quoted body
$fn$;
alter table realtime.messages enable row level security;`,
    ],
  ])('rejects the %s managed-object variant with file and line attribution', (_name, line, sql) => {
    const violations = findManagedRealtimeViolations(sql, 'gate-example.sql')

    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ file: 'gate-example.sql', line })
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

  // The predicate below cannot be pinned behaviourally: `public.pvp_rooms` has its own
  // participant-scoped RLS, which masks the room from a non-participant inside this policy's own
  // `exists` subquery, so gutting the clause changes nothing observable while both walls stand.
  // Widen that other policy and this one becomes the only thing between an authenticated player
  // and another pair's authoritative state broadcast (SECURITY.md, in-scope: "reading another
  // room's private Realtime topic"). Asserted as source text because that is where it is visible.
  it('scopes the Realtime broadcast policy to SELECT, to authenticated, and to the two players in the topic room', () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, PVP_MIGRATION), 'utf8')
    const policy =
      /create policy "pvp participants receive authority broadcast"[\s\S]*?;/.exec(sql)?.[0] ?? ''

    expect(policy).toMatch(/\bfor\s+select\b/)
    expect(policy).toMatch(/\bto\s+authenticated\b/)
    expect(policy).toMatch(
      /room\.id::text\s*=\s*substring\(\(select realtime\.topic\(\)\) from 5\)/,
    )
    expect(policy).toMatch(/\(select auth\.uid\(\)\)\s*=\s*room\.host_profile_id/)
    expect(policy).toMatch(/\(select auth\.uid\(\)\)\s*=\s*room\.guest_profile_id/)
  })
})
