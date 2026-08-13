# Branch protection on `master` — why it stops at 8/10

**Decision, HetCreep, 2026-08-13.** Scorecard alert #7 (`Branch-Protection`, High,
supply-chain) is **dismissed as `won't fix`**, not fixed. This file is the reasoning the
dismissal comment points at — GitHub caps that comment at 280 characters, which is not enough
room to justify accepting a High finding.

This is an **open state** document: the decision is correct today and expected to expire. The
condition that would reverse it is named at the bottom.

## What is already set

Everything the check grades except two items, verified against the API rather than the settings
UI:

| setting                               | state                                          |
| ------------------------------------- | ---------------------------------------------- |
| `allow_force_pushes`                  | disabled                                       |
| `allow_deletions`                     | disabled                                       |
| `required_status_checks` (strict)     | 10 checks, must be up to date                  |
| `dismiss_stale_reviews`               | enabled                                        |
| `require_code_owner_reviews`          | enabled (`.github/CODEOWNERS` → `* @HetCreep`) |
| `require_last_push_approval`          | enabled                                        |
| `required_conversation_resolution`    | enabled                                        |
| **`enforce_admins`**                  | **disabled** ← warned                          |
| **`required_approving_review_count`** | **1** (Tier 4 wants 2) ← warned                |

Tiers 1-3 are fully satisfied. The missing 2 points are Tier 4's second reviewer and Tier 5's
include-administrators.

## Why the two remaining points are not reachable

**They are unreachable, not unconsidered.** This repository has one active maintainer.

GitHub does not permit approving your own pull request, and `CODEOWNERS` resolves to that same
person. So `enforce_admins: true` combined with `required_approving_review_count: 1` does not
tighten the workflow — **it stops every merge**, permanently, including a merge that fixes a
security defect. The maintainer would be locked out of their own repository by a control meant
to protect it.

Requiring two reviewers has the same problem one step further out. There are four
collaborators (`HetCreep` admin, `katomnoistudio-oss` admin, `DemoGODRTX` write,
`nustanakritwithai` read), but only one of them reviews code today — and the pool got smaller
rather than larger the same week this was written: `nustanakritwithai` left the project on
2026-08-13, their access deliberately kept so the contribution record stays whole. `DemoGODRTX`
holds write and has open pull requests, so they are the nearest candidate if this is ever to be
reversed, but reviewing is not something to assume of someone who has not been asked.

## What the bypass actually skips

This is the part worth being precise about, because "admin bypass" sounds like "no checks run".

**Every push to `master` runs the full required-check set, and nothing lands red.** What the
admin bypass permits is skipping the _pull-request ceremony_ — opening a PR, waiting for an
approval that cannot come — not skipping CI. The 10 required checks (CI on four
OS/Node combinations, CodeQL, code-quality analysis, secret scanning, dependency audit,
dependency review) are the protection against the risk this check describes, and they are
intact.

Scorecard cannot see that distinction. Its own documentation says as much:
`EnforceAdmins` is computed as `false` **if any bypass actor exists on any rule, regardless of
whether they are admins** — it is measuring the presence of a bypass, not whether that bypass is
used to skip verification.

## What would reverse this

**A second person who reviews code independently.** At that point `enforce_admins` becomes a
real constraint rather than a lockout, and this dismissal should be **reopened rather than left
standing** — a dismissal that outlives its reason is worse than the original finding, because it
reads as settled.

Until then, do not "fix" this alert by enabling the settings. The failure mode is silent and
total: the next person to try to merge anything will find they cannot, and the reason will not
be obvious from the error.
