# Security Policy

GameTurnBase is a client-side hobby game (React + Vite, deployed to GitHub Pages). There is
no backend server — "the database" is the player's own browser `localStorage`. Read
[`src/data/accountRepository.ts`](src/data/accountRepository.ts)'s header comment for exactly
what that does and does not protect before filing a report; a lot of "issues" that would be
real bugs on a real backend are expected, documented limitations here (see **Out of Scope**).

## Reporting a Vulnerability

Use GitHub private vulnerability reporting — it goes straight to the maintainer, not a public issue:

- <https://github.com/LegendofSoulTH/GameTurnBase/security/advisories/new>

**Do not** open a public GitHub issue for a security report.

Include:

- affected file/commit and the URL or build you tested (production `https://legendofsoulth.github.io/GameTurnBase/` vs. a local dev build)
- steps to reproduce from a clean browser profile
- what trust boundary is actually crossed (see Scope below — this app has very few)
- any logs/screenshots with tokens, emails, or other real data redacted

Expected response:

- **Acknowledgment:** within 7 days (solo-maintained project, best-effort)
- **Fix or mitigation:** no fixed SLA — triaged by actual impact once acknowledged

## Scope

In scope:

- the `LegendofSoulTH/GameTurnBase` repository and its GitHub Actions workflows (`.github/workflows/`)
- the deployed site at `https://legendofsoulth.github.io/GameTurnBase/`
- anything that lets one player's browser affect **another** player's account/data, or that
  exfiltrates data the app didn't already hand to the page itself (real XSS, real CSRF-equivalent,
  supply-chain compromise of a dependency actually shipped in the built bundle)

## Out of Scope

By design, not bugs — don't file these:

- **"I can edit my own account data via DevTools/localStorage."** Expected. The app explicitly
  does not trust the client for anything (see `accountRepository.ts` header). There is no
  server to defraud — editing your own browser's `localStorage` only affects your own browser.
- **"Passwords are hashed client-side with no real server auth."** Documented and intentional —
  see [`src/lib/password.ts`](src/lib/password.ts)'s header comment. This is a local-only demo
  auth layer (PBKDF2 + salt, constant-time compare) so passwords aren't stored in the clear
  even locally; it is explicitly **not** a substitute for real server-side authentication.
- **"GemShopModal payments aren't real / always succeed."** Intentional — no payment gateway is
  wired up yet (see `accountRepository.ts` `topUpGems`). Not a payment-bypass vulnerability;
  there is no real payment to bypass.
- Vulnerabilities in a dependency that this project doesn't actually reach at runtime
  (see `npm audit` in CI first — if it's already flagged/tracked there, no need to duplicate).

## Supply-Chain / CI

- Third-party GitHub Actions are pinned to full commit SHAs, not floating version tags
  (see any `.github/workflows/*.yml`).
- Secret scanning: [`gitleaks`](.github/workflows/security-scan.yml) runs on every push/PR and
  daily via the free CLI directly (not the paid Action, which requires a license for org repos).
- Dependency vulnerabilities: `npm audit --audit-level=high` runs daily and on every push.
- GitHub Dependabot alerts and security updates are enabled on this repo.
