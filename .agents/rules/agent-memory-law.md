# Project Law: Mandatory Agent Memory & Identity Protocol

> **Target Workspace**: `LegendOfSoulTH` (LegendofSoulTH)  
> **Operator / Human User Identity**: `HetCreep`  
> **Scope**: Binding for ALL AI agents, subagents, and automated assistants operating on this codebase.  
> **Last material change**: 2026-08-07 — §4 added (always push `MEMORY.md` with every submit). `RULES_VERSION` bump in `AGENTS.md`.

---

## 📜 Core Mandates

### 1. Mandatory Memory Inspection (`MEMORY.md`)

- Before executing any task, exploring code, or making design decisions, **EVERY AGENT MUST READ** `MEMORY.md` at the project root to load the latest project history, decisions, and system state.

### 2. Continuous Memory Updates & Synthesis

- Agents must continuously update and crystallize work state into `MEMORY.md` at the project root (`MEMORY.md`).
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

1. **On Session Start**: Read `MEMORY.md` to establish context.
2. **During Task Execution**: Keep track of architecture changes, configs, and setup steps.
3. **On Task Completion**: Synthesize learnings and update `MEMORY.md` with timestamp and identity stamps before declaring completion.
4. **On Submit (commit / push / PR)**: Confirm `MEMORY.md` is included in the same delivery — not left unstaged, uncommitted, or only on a local/fork branch that never reaches the target remote.
