# Project Law: Mandatory Agent Memory & Identity Protocol

> **Target Workspace**: `GameTurnBase` (LegendofSoulTH)  
> **Operator / Human User Identity**: `HetCreep`  
> **Scope**: Binding for ALL AI agents, subagents, and automated assistants operating on this codebase.

---

## 📜 Core Mandates

### 1. Mandatory Memory Inspection (`MEMORY.md`)
- Before executing any task, exploring code, or making design decisions, **EVERY AGENT MUST READ** `MEMORY.md` at the project root to load the latest project history, decisions, and system state.

### 2. Continuous Memory Updates & Synthesis
- Agents must continuously update and crystallize work state into `MEMORY.md` at the project root (`c:\Users\zxc59\source\repos\LegendofSoulTH\MEMORY.md`).
- Updates must summarize:
  - **Past Context & History**: High-level timeline of major milestones achieved.
  - **Present Status**: Current working state, active features, and open tasks.
  - **Architectural Learnings & Decisions**: Technical decisions, conventions, and configuration rationale.

### 3. Strict Identity Stamping
- All entries, status updates, and session summaries in `MEMORY.md` **MUST include explicit identity stamps**:
  - **Operator / User**: `HetCreep`
  - **Agent Identity / Model / Subagent Role**: (e.g., `Antigravity AI (Gemini 3.6 Flash)` or Subagent Role)
  - **Timestamp**: (ISO-8601 or local date/time)

---

## 🔄 Protocol Checklist for Agents

1. **On Session Start**: Read `MEMORY.md` to establish context.
2. **During Task Execution**: Keep track of architecture changes, configs, and setup steps.
3. **On Task Completion**: Synthesize learnings and update `MEMORY.md` with timestamp and identity stamps before declaring completion.
