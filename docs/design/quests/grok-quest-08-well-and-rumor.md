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
  - round: DIALOG-R1
    by: executor (opening / stage dialog coverage)
    result: revise — applied
  - round: DIALOG-R2
    by: executor (voice / implementability / cross-quest)
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

**Opening (giver) — Radosław (sołtys / village head)**

> Radosław: "Two households are sick. People whisper poison in the well — and eye Brzeżyna. I'm sołtys here, the village head. Dig for facts before the square tips over. Will you?"

- A: "I'll dig for facts. Where do I start?" → continue to stance; quest starts.
- B: "If Brzeżyna did this, we should say so." → Radosław−5; continue (fear-leaning).
- C: "Not my square." → refuse; quest stays available if honesty/relation gates hold.

**Stance — Radosław (stage-1)**

> Radosław: "The well is not only water. It is calm. Bring me facts from the storehouse, not shouts from the square."

- A: "You'll get facts from the storehouse, not a shout from the square." → `stance=facts`; Radosław+5; pushes barrel investigation; `stage=2`.
- B: "Tomasz apologizes — or he carries buckets for a week." → `stance=mediate`; unlocks mediation later when `proof=barrel`; `stage=2`.
- C: "We can frighten Brzeżyna without proof." → `stance=fear`; Radosław−5; unlocks accuse/cold; moral test; `stage=2`.

Gather clues: talk to sick villagers (shared barrel); Dobrawa on spoilage; Tomasz without hard proof yet.

**Dialog — Sick villager (testimony)**

> Villager: "We drank from the barrel by Tomasz's wall — same as always. By morning the belly turned. Well I can't swear to. That barrel smelled wrong when I thought back."

- A: "I'll check Tomasz's barrel and the well." → clue +1 (shared barrel testimony).
- B: "Sounds like Brzeżyna mischief." → clue +1 but lean toward accuse; honesty risk later if no proof.

**Dialog — Dobrawa (opinion beat)**

> Dobrawa: "Fever after shared drink looks like spoilage. Your well still smells clean when I ladle it. Check the barrel by Tomasz's wall before you blame a neighbor village."

- A: "I'll inspect that barrel." → progress toward `proof=barrel`.

### Stage 2 → 3 — Investigation (`proof`)

| Result | `proof` value |
|--------|----------------|
| Well OK, barrel bad | `barrel` |
| Skipped investigation | `none` |
| Planted / forged evidence | `false` (heavy honesty hit) |

**Discovery — Inspect well and barrel** (environmental)

> *(self)* Well water ladles clean. The shared barrel by Tomasz's wall is sour — spoiled drink, not a foreign poison.

- A: "Proof enough — barrel spoiled, well fine." → `proof=barrel`.
- B: "Skip it. Accuse first, dig later." → `proof=none`; may set `accuse=true`.
- C: *(forge)* "Plant something that points at Brzeżyna." → `proof=false`; Domowice honesty−25 (or per frame row at close).

**Dialog — Tomasz (farmer)**

> Tomasz: "I poured from the same barrel as always. If it's foul, I didn't cook poison — I kept a lid badly. Don't hang Brzeżyna for my sour beer."

- A: "Then help me show the square the barrel, not a foreign plot." → Tomasz cooperates; prefer `path=truth` / mediation at close; Tomasz+5.
- B: "People want a name. Give them one." → pressure toward `accuse` / `proof=false`; Domowice honesty−5; Tomasz−10.

**Dialog — Radosław (accuse decision after proof)**

> Radosław: "You have what you have. Do we keep this in Domowice — or do you ride to Brzeżyna with an accusation?"

- A: *(proof=barrel)* "We settle it here. No ride." → `accuse=false`; `stage=4`.
- B: "I ride to Brzeżyna." → `accuse=true`; `stage=3`; set `roadActive` (if free).
- C: *(if roadActive already)* blocked: "The road's spoken for — finish the other errand first."

### Stage 3 — Optional Brzeżyna

Only if `accuse=true` (player chooses to accuse Brzeżyna). Otherwise set `stage=4` immediately (skip stage 3). When `accuse=true`: set `roadActive`, run stage 3, then on return clear `roadActive` and set `stage=4`. On abandon during accuse path, clear `roadActive`.

**Dialog — Brzeżyna sołtys (if accuse)**

> Brzeżyna sołtys: "You ride here with sick neighbors and empty hands. I'm sołtys of Brzeżyna — village head. Where is your proof?"

- A: "We're still gathering it — this was a warning." → return Domowice; `proof` may stay `none`; clear `roadActive` on leave; `stage=4` or back to investigate.
- B: "We don't need your water in our trade." → `path=cold`; set `tradeFriction`; clear `roadActive` on leave; `stage=4`.

### Stage 4 — Closing (gated)

| Entry condition | Allowed path | Payout |
|-----------------|--------------|--------|
| `proof=barrel` + player tells the truth | **truth** (default) **or** **mediation** (if `stance=mediate` — Tomasz withdraws without public shame) | **truth:** `from: treasury_home` 35 (`if_empty: partial`) + optional bandage×2 from Dobrawa; honesty+15; Radosław+30; Tomasz−20. **mediation:** `from: treasury_home` 20 (`if_empty: partial`); helpfulness+12; roughly +10 with Radosław, Tomasz, Dobrawa |
| `proof=none` + accuse | **cold** (`tradeFriction`) or return to investigate | **cold:** `from: tomasz_purse` 10 (`if_empty: 0`); honesty−20 |
| `proof=false` | **frame** only | `from: treasury_home` 25 (`if_empty: partial`); honesty−40; negative badge stub; `tradeFriction` |
| `proof=barrel` + accuse anyway | cold with **extra** honesty−10 | same money as cold |

**Dialog — Radosław (final)**

> Radosław: "Say it on the square or in my ear — but say what the barrel taught you."

- A: *(proof=barrel)* "The well is clean. The barrel spoiled. Tomasz shares the fault of a bad lid, not a foreign poisoner." → `path=truth`; apply truth rewards; `done`.
- B: *(mediation unlocked: `proof=barrel` + `stance=mediate`)* "No public hanging of a name. Tomasz makes it right quietly." → `path=mediation`; apply mediation rewards; `done`.
- C: *(proof=none + accuse)* "Brzeżyna wanted us weak." → `path=cold`; set `tradeFriction`; apply cold rewards; `done`.
- D: *(proof=false)* "Here's what points at Brzeżyna." → `path=frame`; set `tradeFriction`; apply frame rewards; `done`.
- E: *(proof=barrel + accuse anyway)* "Barrel or not — Brzeżyna still eats the blame." → `path=cold`; honesty−10 extra; apply cold money; `done`.

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Authored barrel + sick count; proof gate; named treasury; `tradeFriction`; mediation gate (`proof=barrel` + `stance=mediate`) |
| **Stub** | Negative badge on frame |
| **Out of scope** | Square crowd UI; full diplomacy matrix |
