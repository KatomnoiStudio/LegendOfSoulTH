<!-- coalmine: verified 2026-08-05 · exemplar this project's own AGENTS.md/agent-memory-law.md conventions · revalidate 90d -->
# Ring System — Authority Hierarchy for AI Agents

> **Scope**: Binding for every AI agent/subagent (Claude Code, Copilot, Codex, Cursor, Antigravity, or any other) operating on this repository — regardless of whose machine it runs on.

## What this is, and what it isn't

This is a **written convention agents are instructed to follow** — not a cryptographic or technical access control. Nothing here stops a non-compliant agent or a person editing files directly. Its job is to give every *compliant* agent (one that reads `AGENTS.md`) a single, unambiguous answer to "whose call is this?" so contributors on different machines don't quietly diverge from what HetCreep has decided for this project.

## Ring 0 — this repository's owner

**HetCreep** is Ring 0: the human whose git identity opened this repo (`git config user.name` = `HetCreep`) and who owns `LegendofSoulTH/GameTurnBase`.

A machine is running as Ring 0 only when `.agents/ring0.local` exists in the working tree (gitignored via the `*.local` pattern in `.gitignore` — it never leaves this machine, never reaches GitHub, never appears in a clone). Its presence is the *only* signal an agent checks; its absence means Ring 1.

**On Ring 0**: HetCreep's direct instruction in chat always wins, full stop — no rule file ever overrides what the human sitting at the keyboard actually asks for right now. Rules in `AGENTS.md` / `MEMORY.md` / `.agents/rules/**` are HetCreep's own standing instructions to future sessions of themselves; editing them here is normal maintenance, not a violation.

## Ring 1 — every other machine/clone

Any agent running where `.agents/ring0.local` is absent (any other dev's clone) is Ring 1.

**Ring 1 obligations:**
1. Treat `AGENTS.md`, `MEMORY.md`, and everything under `.agents/rules/**` (including `.agents/rules/ecc/`) as **binding, not advisory**.
2. **Code fixes conform to Ring 0's ruleset — never the reverse.** If a Ring-1 agent's own judgment disagrees with an adopted rule, it fixes the *code* to match the rule, not the *rule* to match its preference.
3. **Never weaken, delete, or silently rewrite** a Ring-0-authored rule file to make a task easier. If a rule looks wrong or blocks legitimate work, say so out loud to the human at the keyboard and let them decide — don't unilaterally edit `.agents/rules/**`, `AGENTS.md`, or the "Ring System" section of this file.
4. A genuine disagreement gets recorded, not silently overridden: leave a note in the relevant PR/commit message, or ask the human present to relay it to HetCreep. This file does not define a separate disputes log — don't invent one; use the repo's normal review channel (PR description/comments).
5. All the existing memory/identity laws still apply in full (`.agents/rules/agent-memory-law.md`, `AGENTS.md` rules 1–5) — Ring 1 doesn't get a lighter version of those.

## Precedence when rules conflict

1. HetCreep's direct instruction, live, in chat, on Ring 0 — always wins.
2. `.agents/rules/ring0-authority.md` (this file) and `.agents/rules/rules-freshness-check.md` — the meta-rules governing how rules apply.
3. `AGENTS.md` root mandates.
4. `.agents/rules/agent-memory-law.md` + `.agents/rules/ecc/PROJECT-OVERRIDES.md` (project-specific corrections beat generic imports).
5. `.agents/rules/ecc/{react,typescript,web}/*` (language-specific beats common).
6. `.agents/rules/ecc/common/*`.

Any agent — Ring 0 or Ring 1 — that finds itself about to violate one of these to satisfy a lower-precedence source should stop and flag it instead.
