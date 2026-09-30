---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: pass-with-nits
provider_reviews:
  - note: Prior Polish pack PL rounds 1–3 (pass-with-nits). New EN review wave below.
  - round: EN-R1
    by: executor (clarity / implementability)
    result: revise-heavy — applied
  - round: EN-R2
    by: executor (cross-quest consistency)
    result: revise-light — applied
  - round: EN-R3
    by: executor (dialog aloud / ship readiness)
    result: pass-with-nits — applied
---

# 08 — Well and Rumor

**Premise:** Village head **Radosław** fears the Domowice well is poisoned after several people fall sick. The authored truth is a **spoiled shared barrel**, not the well — and a false accusation toward Brzeżyna can start a cold trade war.

## Meta

| Field | Value |
|-------|-------|
| Level | Domowice honesty ≥5 **or** Radosław relation ≥10 |
| Stages | 4 |
| Settlements | Domowice; optional Brzeżyna on accusation path |
| Giver | **Radosław** — sołtys-on-farmer (**sołtys** = village head role on a farmer NPC) |
| Others | **Tomasz** (farmer, household by the square); **Dobrawa** (medical/spoilage opinion) |
| Authored setup | `spoiledBarrel=true`; `sickCount ≥ 2` |
| `roadActive` | **Only** if the player takes the Brzeżyna **accusation** path |
| Friction flag | `tradeFriction` (v1 "cold war" between settlements) |

## Characters

- **Radosław** — Domowice sołtys (village head); cares about calm around the well as much as water quality.
- **Tomasz** — Farmer whose household shares the spoiled barrel; may be shamed or quietly walked back in mediation.
- **Dobrawa** — Herbalist; can confirm spoilage vs well water (opinion / simple check).
- Sick villagers — at least two authored sick NPCs sharing the barrel (names flexible; non-lock).

## World truth

The well water is fine. A shared **barrel** of food/drink spoiled and made people sick. Tomasz looks guilty under rumor pressure but is not a poisoner. Framing Brzeżyna or skipping proof can set `tradeFriction`.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q08.stage` | 1 → 2 → 3 (optional) → 4. **Skip rule:** if `accuse=false` after stage 2, set `stage=4` directly (do not enter stage 3). If `accuse=true`, set `stage=3`, then 4 when back. |
| `q08.clues` | Testimony gathered in stage 1 |
| `q08.proof` | `barrel` \| `none` \| `false` |
| `q08.stance` | `facts` \| `mediate` \| `fear` — set in dialog with Radosław |
| `q08.accuse` | True if player goes to Brzeżyna to accuse |
| `q08.path` | `truth` \| `mediation` \| `cold` \| `frame` |
| Mediation gate | `proof=barrel` **and** `stance=mediate` |
| `tradeFriction` | Set on cold / frame paths |

---

## Stages

### Stage 1 → 2 — Testimony (`clues`)

**Dialog — Radosław (sołtys), quest offer**

> Radosław: "The well is not only water. It is calm. When calm tips over, even clean water tastes bitter. Two households are sick. People already eye Brzeżyna. Bring me facts from the storehouse, not shouts from the square."

- A: "You'll get facts from the storehouse, not a shout from the square." → `stance=facts`; Radosław+5; pushes barrel investigation; `stage=2`.
- B: "Tomasz apologizes — or he carries buckets for a week." → `stance=mediate`; unlocks mediation later when `proof=barrel`; `stage=2`.
- C: "We can frighten Brzeżyna without proof." → `stance=fear`; Radosław−5; unlocks accuse/cold; moral test; `stage=2`.

Gather clues: talk to sick villagers (shared barrel); Dobrawa on spoilage; Tomasz without hard proof yet.

**Dialog — Dobrawa (opinion beat)**

> Dobrawa: "Fever after shared drink looks like spoilage. Your well still smells clean when I ladle it. Check the barrel by Tomasz's wall before you blame a neighbor village."

- A: "I'll inspect that barrel." → progress toward `proof=barrel`.

### Stage 2 → 3 — Investigation (`proof`)

| Result | `proof` value |
|--------|----------------|
| Well OK, barrel bad | `barrel` |
| Skipped investigation | `none` |
| Planted / forged evidence | `false` (heavy honesty hit) |

**Dialog — Tomasz (farmer)**

> Tomasz: "I poured from the same barrel as always. If it's foul, I didn't cook poison — I kept a lid badly. Don't hang Brzeżyna for my sour beer."

- A: "Then help me show the square the barrel, not a foreign plot." → supports truth/mediation.
- B: "People want a name. Give them one." → pushes toward false/accuse pressure; honesty risk.

### Stage 3 — Optional Brzeżyna

Only if `accuse=true` (player chooses to accuse Brzeżyna). Otherwise set `stage=4` immediately (skip stage 3). When `accuse=true`: set `roadActive`, run stage 3, then on return clear `roadActive` and set `stage=4`. On abandon during accuse path, clear `roadActive`.

**Dialog — Brzeżyna sołtys (if accuse)**

> Brzeżyna sołtys: "You ride here with sick neighbors and empty hands. Where is your proof?"

- A: "We're still gathering it — this was a warning." → can return to investigate (`proof` may stay `none`).
- B: "We don't need your water in our trade." → push `cold` / `tradeFriction`.

### Stage 4 — Closing (gated)

| Entry condition | Allowed path | Payout |
|-----------------|--------------|--------|
| `proof=barrel` + player tells the truth | **truth** (default) **or** **mediation** (if `stance=mediate` — Tomasz withdraws without public shame) | **truth:** `from: treasury_home` 35 (`if_empty: partial`) + optional bandage×2 from Dobrawa; honesty+15; Radosław+30; Tomasz−20. **mediation:** `from: treasury_home` 20 (`if_empty: partial`); helpfulness+12; roughly +10 with Radosław, Tomasz, Dobrawa |
| `proof=none` + accuse | **cold** (`tradeFriction`) or return to investigate | **cold:** `from: tomasz_purse` 10 (`if_empty: 0`); honesty−20 |
| `proof=false` | **frame** only | `from: treasury_home` 25 (`if_empty: partial`); honesty−40; negative badge stub; `tradeFriction` |
| `proof=barrel` + accuse anyway | cold with **extra** honesty−10 | same money as cold |

**Dialog — Radosław (final)**

> Radosław: "Say it on the square or in my ear — but say what the barrel taught you."

- A: *(proof=barrel)* "The well is clean. The barrel spoiled. Tomasz shares the fault of a bad lid, not a foreign poisoner." → `path=truth` or offer mediation if stance allows.
- B: *(mediation unlocked)* "No public hanging of a name. Tomasz makes it right quietly." → `path=mediation`.
- C: *(no / false proof)* "Brzeżyna wanted us weak." → `path=cold` or `frame` per `proof`.

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Authored barrel + sick count; proof gate; named treasury; `tradeFriction`; mediation gate (`proof=barrel` + `stance=mediate`) |
| **Stub** | Negative badge on frame |
| **Out of scope** | Square crowd UI; full diplomacy matrix |
