#!/usr/bin/env node
// Mechanical citation checker for docs/agent-blueprint/*.md contracts.
// READ-ONLY: reads docs/agent-blueprint/** and whatever repo files those
// contracts cite; writes nothing back into the repo.
//
// Exits 1 when a citation points at a file or line that does not exist
// (MISSING-FILE / PAST-EOF); SYMBOL-MISMATCH is heuristic and advisory only.
// Wired into .github/workflows/ci.yml as the "Blueprint citation check" job.
//
// Citation shapes handled (backtick-wrapped only — per task spec, a bare
// "§4.2/AGENT_BLUEPRINT.md:85" mentioned in plain prose without backticks is
// NOT a citation and is intentionally not checked):
//   `src/foo/bar.ts:123`        full path, single line
//   `src/foo/bar.ts:120-140`    full path, range
//   `bar.ts:120,140`            bare filename (basename only), comma list
//   `bar.ts:111-117,138-144`    bare filename, range+comma mix
//   `:120-140`                  shorthand — inherits whatever file the
//                               nearest preceding citation IN THIS DOC
//                               resolved to (real, recurring pattern: see
//                               01-movement-system.md's done-criteria list)
//
// ponytail: hand-rolled recursive directory walk instead of Node's newer
// fs.readdirSync(dir, {recursive:true}) — same handful of lines either way,
// but this doesn't pin correctness to a specific Node version's flag shape.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This file lives at <repo>/tools/; repo root is one level up. Derived, never
// hardcoded — the checker must run on any contributor's machine (AGENTS.md rule 4).
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS_DIR = path.join(REPO_ROOT, 'docs', 'agent-blueprint');

// .claude is excluded because .claude/worktrees/** holds full nested git
// worktree checkouts (confirmed via `git worktree list`) that mirror the
// entire src/ tree — without this exclusion every basename lookup falsely
// "ambiguates" against its own worktree copy.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out', '.vercel', '.turbo', '.claude']);
// Extensions that mean "this dotted backtick span is a filename fragment,
// not a Class.method-style symbol" — e.g. `accountRepository.ts` (no line
// number attached) sitting next to a citation isn't the symbol to grep for.
const EXT_DENYLIST = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'sql', 'md', 'json', 'css', 'scss', 'html', 'yml', 'yaml', 'txt']);
const CONTEXT_GAP_MAX = 60; // chars of connective prose allowed between a symbol span and its citation span

// Matches the FULL content of a backtick span, nothing more:
//   group1 (optional) = path/basename, must end in ".ext"
//   group2            = line spec: N | N-M | comma list of either
const CITATION_RE = /^([\w./-]+\.\w+)?:(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)$/;
// A simple identifier or dotted identifier chain (Class.method), optionally
// called: `foo`, `ROSTER`, `EnemyAISystem.tickTimers`, `getCharacter()`.
const SYMBOL_RE = /^([A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*$/;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------- 1. repo-wide basename index, for resolving bare filenames ----------
function buildBasenameIndex(root) {
  const index = new Map(); // basename -> repo-relative path[]
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        const rel = path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/');
        const list = index.get(entry.name);
        if (list) list.push(rel);
        else index.set(entry.name, [rel]);
      }
    }
  })(root);
  return index;
}

// ---------- 2. cited-file content cache ----------
const fileCache = new Map(); // repo-relative path -> { lines: string[] } | null
function loadFile(relPath) {
  if (fileCache.has(relPath)) return fileCache.get(relPath);
  let result = null;
  try {
    const abs = path.resolve(REPO_ROOT, relPath);
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      const content = fs.readFileSync(abs, 'utf8');
      const lines = content.split(/\r\n|\r|\n/);
      // A trailing newline shouldn't count as an extra phantom line.
      if (lines.length > 0 && lines[lines.length - 1] === '' && /[\r\n]$/.test(content)) lines.pop();
      result = { lines };
    }
  } catch {
    result = null;
  }
  fileCache.set(relPath, result);
  return result;
}

// ---------- 3. backtick-span extraction (fenced code blocks stripped) ----------
function extractSpans(rawText) {
  // Replace fenced blocks with equal-length blanks so char offsets used for
  // gap/adjacency math below stay valid, and any backticks the fence itself
  // used (```lang, or stray inline backticks inside example code) can't
  // desync the single-backtick pairing that follows.
  const stripped = rawText.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  const spans = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(stripped))) {
    spans.push({ text: m[1], start: m.index, end: m.index + m[0].length });
  }
  const backtickCount = (stripped.match(/`/g) || []).length;
  return { spans, stripped, unbalanced: backtickCount % 2 !== 0 };
}

function isSymbolCandidate(raw) {
  let s = raw.trim();
  if (s.endsWith('()')) s = s.slice(0, -2);
  if (!SYMBOL_RE.test(s)) return null;
  const segs = s.split('.');
  const last = segs[segs.length - 1];
  if (segs.length > 1 && EXT_DENYLIST.has(last.toLowerCase())) return null; // e.g. `accountRepository.ts`
  return last;
}

// A gap "crosses a boundary" (disqualifies the neighbor even within the char
// budget) when it contains a blank line, starts a new list item, or exits
// one parenthetical aside and opens another — three patterns confirmed by
// hand against real contract text to produce wrong symbol picks:
//   - blank line: obvious paragraph break.
//   - new list item ("\n3. Foo" / "\n- Foo"): contract-13's citation for
//     done-criterion #2 otherwise grabs `ROSTER`, which is actually the
//     *next* list item's subject (done-criterion #3), not this one's.
//   - "), ... (": contract-01's Scope sentence lists several unrelated
//     "system X does NOT own Y (citation)" clauses back to back; without
//     this check, a citation at the end of one clause grabs the *next*
//     clause's symbol across the "), verb phrase (" connector.
function crossesBoundary(gap) {
  if (gap.includes('\n\n')) return true;
  if (/\n[ \t]*(?:[-*]|\d+\.)[ \t]/.test(gap)) return true;
  if (gap.includes('(') && gap.includes(')')) return true;
  return false;
}

// "immediately before or after" per spec — nearest backtick-span neighbor,
// skipping straight to "none" (not searching further) when that neighbor is
// itself a citation, isn't identifier-shaped, or the connecting prose is too
// long / crosses a boundary. Heuristic by design (see task note).
function findAdjacentSymbol(spans, idx, text) {
  if (idx > 0) {
    const prev = spans[idx - 1];
    const cur = spans[idx];
    const gap = text.slice(prev.end, cur.start);
    if (gap.length <= CONTEXT_GAP_MAX && !crossesBoundary(gap) && !CITATION_RE.test(prev.text)) {
      const sym = isSymbolCandidate(prev.text);
      if (sym) return sym;
    }
  }
  if (idx < spans.length - 1) {
    const next = spans[idx + 1];
    const cur = spans[idx];
    const gap = text.slice(cur.end, next.start);
    if (gap.length <= CONTEXT_GAP_MAX && !crossesBoundary(gap) && !CITATION_RE.test(next.text)) {
      const sym = isSymbolCandidate(next.text);
      if (sym) return sym;
    }
  }
  return null;
}

function parseLineSpec(spec) {
  const nums = [];
  for (const token of spec.split(',')) {
    for (const part of token.split('-')) nums.push(Number(part));
  }
  return nums;
}

// ---------- 4. per-citation check ----------
function checkCitation(citationText, spans, idx, text, basenameIndex, docState) {
  const [, pathPart, lineSpec] = CITATION_RE.exec(citationText);
  let resolvedRel = null;

  if (pathPart && pathPart.includes('/')) {
    resolvedRel = pathPart;
  } else if (pathPart) {
    if (docState.lastFullPathByBasename.has(pathPart)) {
      resolvedRel = docState.lastFullPathByBasename.get(pathPart);
    } else {
      const candidates = basenameIndex.get(pathPart) ?? [];
      if (candidates.length === 0) {
        docState.lastResolvedPath = null; // don't let a later `:N` inherit a stale unrelated file
        return { verdict: 'MISSING-FILE', detail: `no file named "${pathPart}" found under repo root` };
      } else if (candidates.length > 1) {
        docState.lastResolvedPath = null;
        return {
          verdict: 'MISSING-FILE',
          detail: `ambiguous bare filename "${pathPart}" — ${candidates.length} candidates: ${candidates.slice(0, 5).join(', ')}${candidates.length > 5 ? ', …' : ''}`,
        };
      }
      resolvedRel = candidates[0];
    }
  } else {
    // shorthand `:N` — inherit the most recently resolved file in this doc
    if (!docState.lastResolvedPath) {
      return { verdict: 'MISSING-FILE', detail: 'shorthand `:N` citation with no resolvable preceding file citation in this document' };
    }
    resolvedRel = docState.lastResolvedPath;
  }

  docState.lastFullPathByBasename.set(path.posix.basename(resolvedRel), resolvedRel);
  docState.lastResolvedPath = resolvedRel;

  const file = loadFile(resolvedRel);
  if (!file) {
    return { verdict: 'MISSING-FILE', detail: `${resolvedRel} does not exist under repo root` };
  }

  const nums = parseLineSpec(lineSpec);
  const minCited = Math.min(...nums);
  const maxCited = Math.max(...nums);
  const lineCount = file.lines.length;
  if (minCited < 1 || maxCited > lineCount) {
    return { verdict: 'PAST-EOF', detail: `cites line ${maxCited} but ${resolvedRel} has ${lineCount} lines` };
  }

  const symbol = findAdjacentSymbol(spans, idx, text);
  if (!symbol) {
    return { verdict: 'OK', detail: 'no adjacent symbol to verify (heuristic has nothing to check)', noSymbol: true };
  }
  const from = Math.max(0, minCited - 1 - 3);
  const to = Math.min(lineCount - 1, maxCited - 1 + 3);
  const windowText = file.lines.slice(from, to + 1).join('\n');
  // SQL keywords/identifiers are conventionally case-insensitive (confirmed:
  // a contract citing `CHECK` next to a migration line landed on the file's
  // own lowercase `check (...)`) — case-sensitive everywhere else, since TS
  // identifier casing is meaningful (Foo the class vs foo the variable).
  const symRe = new RegExp(`\\b${escapeRegExp(symbol)}\\b`, resolvedRel.endsWith('.sql') ? 'i' : '');
  if (symRe.test(windowText)) {
    return { verdict: 'OK', detail: `symbol \`${symbol}\` confirmed within lines ${from + 1}-${to + 1}` };
  }
  return { verdict: 'SYMBOL-MISMATCH', detail: `symbol \`${symbol}\` not found within lines ${from + 1}-${to + 1} of ${resolvedRel} (heuristic — verify by hand)` };
}

// ---------- 5. driver ----------
function main() {
  const basenameIndex = buildBasenameIndex(REPO_ROOT);
  const contractFiles = fs
    .readdirSync(CONTRACTS_DIR)
    .filter((f) => /^\d+.*\.md$/.test(f))
    .toSorted();

  const totals = { OK: 0, 'MISSING-FILE': 0, 'PAST-EOF': 0, 'SYMBOL-MISMATCH': 0, noSymbol: 0, total: 0 };

  for (const file of contractFiles) {
    const raw = fs.readFileSync(path.join(CONTRACTS_DIR, file), 'utf8');
    const { spans, stripped, unbalanced } = extractSpans(raw);
    if (unbalanced) {
      console.log(`\n[WARN] ${file}: odd number of backticks outside fenced code blocks — span parsing may desync past the imbalance point`);
    }

    const docState = { lastFullPathByBasename: new Map(), lastResolvedPath: null };
    const flagged = [];
    let fileTotal = 0;
    let fileOK = 0;

    spans.forEach((span, idx) => {
      if (!CITATION_RE.test(span.text)) return;
      fileTotal++;
      totals.total++;
      const result = checkCitation(span.text, spans, idx, stripped, basenameIndex, docState);
      totals[result.verdict]++;
      if (result.noSymbol) totals.noSymbol++;
      if (result.verdict === 'OK') fileOK++;
      else flagged.push({ contract: file, citation: span.text, verdict: result.verdict, detail: result.detail });
    });

    if (fileTotal === 0) {
      console.log(`\n${file}: no citations found`);
    } else if (flagged.length === 0) {
      console.log(`\n${file}: all ${fileTotal} citations resolve`);
    } else {
      console.log(`\n${file}: ${fileTotal} citations, ${fileOK} OK, ${flagged.length} flagged`);
      console.log('contract | citation | verdict | detail');
      for (const row of flagged) {
        console.log(`${row.contract} | \`${row.citation}\` | ${row.verdict} | ${row.detail}`);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total citations checked: ${totals.total}`);
  console.log(`  OK:              ${totals.OK}`);
  console.log(`  MISSING-FILE:    ${totals['MISSING-FILE']}`);
  console.log(`  PAST-EOF:        ${totals['PAST-EOF']}`);
  console.log(`  SYMBOL-MISMATCH: ${totals['SYMBOL-MISMATCH']}`);
  console.log(`  (of which OK citations had no adjacent symbol to check: ${totals.noSymbol})`);

  // Exit code, so CI can gate on this instead of the tool always reporting green.
  // Only the two DETERMINISTIC verdicts block: MISSING-FILE (the cited path
  // resolves to nothing, or a bare filename is ambiguous) and PAST-EOF (the
  // cited line is beyond the file's length). Both are provable from the tree.
  // SYMBOL-MISMATCH stays advisory on purpose — the adjacency rule that picks
  // the symbol is a heuristic this file labels as such at the point it emits
  // the verdict, so it reports but must never fail a build.
  const blocking = totals['MISSING-FILE'] + totals['PAST-EOF'];
  if (blocking > 0) {
    console.error(
      `\n${blocking} citation(s) point at a file or line that does not exist — fix those. ` +
        `SYMBOL-MISMATCH is heuristic and does not fail this check.`,
    );
    process.exitCode = 1;
  }
}

main();
