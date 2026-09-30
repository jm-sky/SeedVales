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

# 05 — Disputed Oak

**Premise:** Woodcutter **Mirosław** of Domowice and **Kazimierz** of Brzeżyna both claim a boundary oak. The player gathers evidence and brokers (or breaks) a deal — no bridge-building, no Janko.

## Meta

| Field | Value |
|-------|-------|
| Level | After the player's first visit to Brzeżyna |
| Stages | 3 |
| Settlements | Domowice ↔ Brzeżyna (boundary) |
| Giver | **Mirosław** (`sett.woodcutter`) |
| Antagonist | **Kazimierz** — reserved Brzeżyna adult |
| Witness | Wanda (role-tag) **or** a Brzeżyna farmer |
| Banned | Janko; building a bridge |
| `roadActive` | **Yes** |

## Characters

- **Mirosław** — Domowice woodcutter; believes the oak stands on home soil.
- **Kazimierz** — Brzeżyna landholder; reserved antagonist; remembers the oak longer than "paper protocols."
- **Wanda** or a **Brzeżyna farmer** — optional pasture witness for evidence.
- Settlement treasuries: `treasury_home` and `treasury_brzezyna` pay peace / one-sided awards.

## World truth

The oak sits on a fuzzy boundary. Enough physical evidence exists for a fair peace (bark mark, boundary stone, pasture witness, tree age). Theft (night felling) is possible but poisons relations and raises wood prices. No bridge project is part of this quest.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q05.stage` | 1 → 2 → 3 |
| `q05.evidence` | Counter; need **≥2** distinct evidence pieces to unlock peace / solid verdicts |
| Evidence kinds | Bark mark; **boundary stone** (find); pasture witness; oak age (Survival) |
| `q05.askedStone` | Player pressed Kazimierz about the stone |
| `q05.framedAsDispute` | Player framed it as a dispute, not holy ground — unlocks peace talk with sołtys |
| `q05.deal` | Exclusive: `peace` \| `home` \| `brz` \| `theft` |

---

## Stages

### Stage 1 → 2 (evidence ≥2)

**Dialog — Mirosław (woodcutter), quest offer**

> Mirosław: "That oak drinks from our ditch as much as theirs. Kazimierz talks like the tree filed a deed. Bring me marks on wood and stone — not tavern noise — and we'll settle it."

- A: "I'll walk the boundary and collect proof." → `stage=2`; set `roadActive`.
- B: "If proof fails, we still talk before axes." → Mirosław+5; `stage=2`; set `roadActive`.


**Dialog — Wanda or Brzeżyna farmer (pasture witness)**

> Witness: "I watched flocks along that ditch since spring. The oak stands where our sheep turn back — Brzeżyna side if you ask me, but Domowice notches are in the bark too. I'll swear to what I saw, not to whose axe is right."

- A: "That counts as a witness mark. Thank you." → evidence +1 (pasture witness).

Gather evidence (any two):

1. Inspect bark mark on the oak.
2. Find the **boundary stone** in the grass / ditch.
3. Hear pasture witness (Wanda or farmer).
4. Survival read of the oak's age vs both villages' claims.

### Stage 2 → 3 (choose `deal`)

| ID | Verdict |
|----|---------|
| **peace** | Oak stays standing; each side fells **2 non-boundary** trees instead |
| **home** | One-sided ruling for Domowice / Mirosław |
| **brz** | One-sided ruling for Brzeżyna / Kazimierz |
| **theft** | Night felling of the oak (player or hired) |

**Peace work (light Required):** one work session ~10–15 minutes play **or** 1 shortened calendar hour; woodcutting skill helps. Fail-forward: deal still stands but payout −5 copper. *(Stub: skip minigame → auto-success with log×1.)*

**Dialog — Kazimierz (Brzeżyna)**

> Kazimierz: "People from Domowice have short memories and long axes. This oak remembers longer than your protocols."

- A: "Show me the mark on the stone, not on your temper." → `askedStone=true`; Kazimierz+5 if player already found the stone.
- B: "There's a Domowice notch in the bark too. This is a dispute, not a shrine." → `framedAsDispute=true`; unlocks peace option in sołtys dialog.
- C: "Leave the oak. Take beams from trees that don't guard the ditch." → if evidence ≥2: `deal=peace`; else Kazimierz: "Bring proof first."

**Dialog — Sołtys (mediation beat, after evidence ≥2)**

> Sołtys: "Two villages, one trunk. Speak a verdict I can write without starting a feud."

- A: "Peace — oak stands; each side takes two trees elsewhere." → `deal=peace` (requires evidence ≥2 and preferably `framedAsDispute`).
- B: "The marks favor Domowice." → `deal=home`.
- C: "The marks favor Brzeżyna." → `deal=brz`.
- D: *(decline mediation; later theft)* leave without deal — theft remains available as a night action.

Set `deal`; `stage=3`.

### Stage 3 — Rewards

**Dialog — Mirosław (closing)**

> Mirosław: "Say it plain. Does the oak stand, fall for us, fall for them — or did someone already swing in the dark?"

| deal | Payout | Reputation | Relations |
|------|--------|------------|-----------|
| peace | `from: treasury_home` 15 + `from: treasury_brzezyna` 15 (`if_empty: partial`) + log×1 per side | helpfulness+10 both | Mirosław+20; Kazimierz+20 |
| home | `from: treasury_home` 20 (`if_empty: partial`) | Domowice honesty+5; Brzeżyna honesty−5 | Mirosław+25; Kazimierz−25 |
| brz | `from: treasury_brzezyna` 20 (`if_empty: partial`) | Brzeżyna honesty+5; Domowice honesty−5 | Kazimierz+25; Mirosław−25 |
| theft | log×4 (no treasury pay) | honesty−20 both | both −30; `priceMod.wood` increases |

Clear `roadActive` on successful close, fail, or abandon.

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Evidence markers; exclusive `deal`; named treasuries |
| **Stub** | Peace work session auto-succeeds |
| **Out of scope** | Bridge build; Janko |
