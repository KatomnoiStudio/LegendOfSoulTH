<!-- coalmine: verified 2026-08-06 · exemplar this project's own AGENTS.md/agent-memory-law.md conventions · revalidate 90d -->
# Ring System — Authority Hierarchy for AI Agents

> **Scope**: Binding for every AI agent/subagent (Claude Code, Copilot, Codex, Cursor, Antigravity, or any other) operating on this repository — regardless of whose machine it runs on, **including cloud/hosted agent sessions** (GitHub Copilot coding agent, Claude Code cloud, Codex cloud, or similar). See "Cloud agents" below — this file was originally written machine-marker-only and didn't cover that case; fixed 2026-08-06.

## What this is, and what it isn't

This is a **written convention agents are instructed to follow** — not a cryptographic or technical access control. Nothing here stops a non-compliant agent or a person editing files directly. Its job is to give every *compliant* agent (one that reads `AGENTS.md`) a single, unambiguous answer to "whose call is this?" so contributors on different machines — or different cloud sessions — don't quietly diverge from what HetCreep has decided for this project.

## Ring 0 — this repository's owner

**HetCreep** is Ring 0: the human who owns `LegendofSoulTH/GameTurnBase`.

An agent is running as Ring 0 when **either** signal below matches — check both, either one is sufficient:

1. **Local marker**: `.agents/ring0.local` exists in the working tree (gitignored via `*.local` in `.gitignore` — never leaves this machine, never reaches GitHub, never appears in a clone). Fast, cheap, works for a persistent local machine.
2. **Git identity**: `git config user.name` == `HetCreep`, or `git config user.email` == `zxc59217412@gmail.com`, or (where available) the authenticated actor driving the session — `gh api user --jq .login` — equals `HetCreep`. This is the signal that actually travels with a **cloud/hosted agent session**: the marker file is local-only and never present in a fresh clone, but a cloud agent authenticated under HetCreep's own account (GitHub OAuth/token) carries HetCreep's identity regardless of which physical or virtual machine it happens to run on.

Neither is cryptographic proof (both are self-reported config, see "What this is, and what it isn't" above) — they're the best signal a markdown-following agent can check without a real access-control system.

## Cloud agents

A cloud/hosted agent session (ephemeral clone, no persistent filesystem) will **never** see `.agents/ring0.local` — that's by design, it's gitignored on purpose. That means signal 2 (git identity / authenticated actor) is the one that actually applies there. Check it explicitly instead of assuming Ring 1 just because the marker file is absent.

## HetCreep's live instruction always wins — independent of Ring

This is decoupled from the Ring 0 marker entirely (an earlier version of this file wrongly tied it to `.agents/ring0.local`'s presence, which broke on cloud agents — fixed here). Whenever the human actively in the conversation **is** HetCreep — confirmed by either Ring 0 signal above, or simply by the platform's own session context establishing who the operator is — their live instruction right now outranks every written rule in this file, `AGENTS.md`, or `.agents/rules/**`. Rules are HetCreep's own standing instructions to future sessions of themselves; a live instruction from HetCreep is just HetCreep talking to the current session directly, which is a *more* current source than a file they wrote earlier. Editing the rule files under this authority is normal maintenance, not a violation.

## Ring 1 — everyone and everything else

No HetCreep identity match (neither signal above) → Ring 1. Covers another contributor's machine, another contributor's cloud agent session, and any fully autonomous/scheduled run with no attributable human directing it live.

**Ring 1 obligations:**
1. Treat `AGENTS.md`, `MEMORY.md`, and everything under `.agents/rules/**` (including `.agents/rules/ecc/`) as **binding, not advisory**.
2. **Code fixes conform to Ring 0's ruleset — never the reverse.** If a Ring-1 agent's own judgment disagrees with an adopted rule, it fixes the *code* to match the rule, not the *rule* to match its preference.
3. **Never weaken, delete, or silently rewrite** a Ring-0-authored rule file to make a task easier. If a rule looks wrong or blocks legitimate work, say so out loud to the human at the keyboard and let them decide — don't unilaterally edit `.agents/rules/**`, `AGENTS.md`, or the "Ring System" section of this file.
4. A genuine disagreement gets recorded, not silently overridden: leave a note in the relevant PR/commit message, or ask the human present to relay it to HetCreep. This file does not define a separate disputes log — don't invent one; use the repo's normal review channel (PR description/comments).
5. All the existing memory/identity laws still apply in full (`.agents/rules/agent-memory-law.md`, `AGENTS.md` rules 1–5) — Ring 1 doesn't get a lighter version of those.
6. A Ring-1 contributor's own live instruction to their own agent is a matter between them and their agent — it does not get this file's "always wins over written rules" treatment, because these particular rules are HetCreep's, not theirs. Their agent still owes obligations 1–5 above; it can flag/push back per #4, not silently comply against the project's binding rules.

## Precedence when rules conflict

1. HetCreep's live instruction, right now, in the current session — confirmed Ring 0 by either signal, or by platform session context — always wins.
2. `.agents/rules/ring0-authority.md` (this file) and `.agents/rules/rules-freshness-check.md` — the meta-rules governing how rules apply.
3. `AGENTS.md` root mandates.
4. `.agents/rules/agent-memory-law.md` + `.agents/rules/ecc/PROJECT-OVERRIDES.md` (project-specific corrections beat generic imports).
5. `.agents/rules/ecc/{react,typescript,web}/*` (language-specific beats common).
6. `.agents/rules/ecc/common/*`.

Any agent — Ring 0 or Ring 1 — that finds itself about to violate one of these to satisfy a lower-precedence source should stop and flag it instead.
