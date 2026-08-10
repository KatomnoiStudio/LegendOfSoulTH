# Project Law: Mandatory Agent Memory & Identity Protocol

> **Target Workspace**: `LegendOfSoulTH` (LegendofSoulTH)  
> **Operator / Human User Identity**: `HetCreep`  
> **Scope**: Binding for ALL AI agents, subagents, and automated assistants operating on this codebase.  
> **Last material change**: 2026-08-10 — §1/§2 describe the file's new index-plus-archive shape (`MEMORY.md` = index, bodies verbatim under `MEMORY/archive/`). Shape only: every obligation in this file is unchanged and still absolute.  
> **Prior material change**: 2026-08-07 — §4 added (always push `MEMORY.md` with every submit). `RULES_VERSION` bump in `AGENTS.md`.

---

## 📜 Core Mandates

### 1. Mandatory Memory Inspection (`MEMORY.md`)

- Before executing any task, exploring code, or making design decisions, **EVERY AGENT MUST READ** `MEMORY.md` at the project root to load the latest project history, decisions, and system state.
- **Shape of the file (2026-08-10)**: `MEMORY.md` is an **index** — its header block, then one line per numbered item, `` - **NNN.** <title> — `MEMORY/archive/NNN-MMM.md` ``. The item **bodies** live verbatim under `MEMORY/archive/`, split into blocks of 25 items (`MEMORY/archive/README.md`). This changed the artifact, not the duty: the mandate above stands exactly as written — read `MEMORY.md` first, every session, all of it.
- The index is the entry point, not the whole record. **When an index line bears on your task, open the `MEMORY/archive/` file it names and read that item in full.** Opening an archive file is expected, not optional; skipping a relevant one is the same failure as skipping `MEMORY.md` was before the split.

### 2. Continuous Memory Updates & Synthesis

- Agents must continuously update and crystallize work state into `MEMORY.md` at the project root (`MEMORY.md`).
- **Where the writing goes**: a new item's **body** is appended to the newest `MEMORY/archive/NNN-MMM.md` block (a new block starts every 25 items) and its **index line** goes into `MEMORY.md`, in the same commit. Existing bodies are never rewritten to "tidy" them — `tools/verify-memory-archive.mjs` asserts they stay byte-identical to the pre-split file, and `MEMORY/archive/` sits in `.prettierignore` so no formatter can silently reflow them. Header/status edits at the top of `MEMORY.md` are unaffected and still go there directly.
- **CRITICAL**: Use relative file paths (`MEMORY.md`, `.agents/rules/...`) only. Do NOT hardcode machine-specific local absolute file paths so the repository remains portable for all contributors.
- Updates must summarize:
  - **Past Context & History**: High-level timeline of major milestones achieved.
  - **Present Status**: Current working state, active features, and open tasks.
  - **Architectural Learnings & Decisions**: Technical decisions, conventions, and configuration rationale.
- **Personal/off-project content is out of scope for `MEMORY.md` entirely** — see
  `.agents/rules/personal-scope-law.md`. It goes in the gitignored `MEMORY.local.md`
  instead. `MEMORY.md` is mandatory reading for every future agent (§1 above); personal
  content there is dead weight every one of those sessions pays for.

### 3. Strict Identity Stamping

- All entries, status updates, and session summaries in `MEMORY.md` **MUST include explicit identity stamps**:
  - **Operator / User**: `HetCreep`
  - **Agent Identity / Model / Subagent Role**: (e.g., `Antigravity AI (Gemini 3.6 Flash)` or Subagent Role)
  - **Timestamp**: (ISO-8601 or local date/time)

### 4. Always submit `MEMORY.md` with every push / PR / handoff

- **HetCreep, 2026-08-07**: whenever you commit, push, open/update a PR, or otherwise
  "ส่งงาน" (submit homework / deliver a completed task), **`MEMORY.md` must be in that
  delivery** — updated for the work just done, staged, committed, and pushed with the
  same branch/PR as the code.
- Leaving `MEMORY.md` only on the local machine (or only on a fork while the PR to
  upstream has no MEMORY update) is a **violation**. Future agents on other machines
  read upstream `MEMORY.md`; if you skip it, they inherit a lie about project state.
- Same commit as the task is preferred when the MEMORY edit is the status write-up for
  that task (see `.agents/rules/commit-granularity-law.md`). A follow-up docs-only
  commit on the **same branch before the PR is handed off** is acceptable if the PR
  number or merge SHA was not known at the first commit — still must land before you
  declare the submit done.
- Does **not** override `.agents/rules/personal-scope-law.md`: personal notes still stay
  out of `MEMORY.md`. This section only mandates that the project memory you _are_
  required to write actually leaves the machine.

---

## 🔄 Protocol Checklist for Agents

1. **On Session Start**: Read `MEMORY.md` to establish context, then open the `MEMORY/archive/` file behind every index line that bears on your task.
2. **During Task Execution**: Keep track of architecture changes, configs, and setup steps.
3. **On Task Completion**: Synthesize learnings and update `MEMORY.md` with timestamp and identity stamps before declaring completion — the new item's body into the newest `MEMORY/archive/` block, its index line into `MEMORY.md`.
4. **On Submit (commit / push / PR)**: Confirm `MEMORY.md` **and the `MEMORY/archive/` file you appended to** are included in the same delivery — not left unstaged, uncommitted, or only on a local/fork branch that never reaches the target remote.
