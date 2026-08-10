# MEMORY/archive

These files are the durable body store for the project journal. Root `MEMORY.md` holds the
same items as a one-line-per-item **index**; the full text of every item lives here, verbatim
and unedited, split into blocks of 25 items (`001-025.md`, `026-050.md`, ...).

**How an agent reads this**: read root `MEMORY.md` first — that obligation is unchanged and
binding (`AGENTS.md` rule 1, `.agents/rules/agent-memory-law.md`). The index tells you what
every item is. When an index line is relevant to your task, open the archive file it points at
and read that item's full body. Opening an archive file is expected, not optional, whenever the
index says the detail matters for what you are doing.

**Writing**: a new item is appended to the newest block file (a new block file starts every
25 items) and gets its index line added to root `MEMORY.md` in the same commit. Bodies are
never rewritten in place to "tidy" them — `tools/verify-memory-archive.mjs` asserts they stay
byte-identical to what was written.
