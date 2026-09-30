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

**Opening (giver) — Mirosław (woodcutter)**

> Mirosław: "Kazimierz of Brzeżyna claims our boundary oak. I say it drinks from Domowice's ditch too. Walk the line, gather proof, help settle it before axes. Will you?"

- A: "I'll walk the boundary and collect proof." → Mirosław+5; `stage=2`; set `roadActive`.
- B: "If proof fails, we still talk before axes." → Mirosław+5; `stage=2`; set `roadActive`.
- C: "Not my fight." → refuse; quest stays available after first Brzeżyna visit.


**Dialog — Wanda or Brzeżyna farmer (pasture witness)**

> Witness: "I watched flocks on that ditch since spring. Oak sits where our sheep turn back — Brzeżyna side to me, but Domowice notches are in the bark. I swear to what I saw, not whose axe is right."

- A: "That counts as a witness mark. Thank you." → evidence +1 (pasture witness).

Gather evidence (any two):

1. Inspect bark mark on the oak.
2. Find the **boundary stone** in the grass / ditch.
3. Hear pasture witness (Wanda or farmer).
4. Survival read of the oak's age vs both villages' claims.

**Discovery — Bark mark** (environmental)

> *(self)* Old Domowice notches cut deep in the bark — and fresher Brzeżyna scratches over them. Both sides left a mark.

- A: "Take that as evidence." → evidence +1 (bark).

**Discovery — Boundary stone** (environmental)

> *(self)* A half-buried stone in the ditch grass. Carved line runs closer to Brzeżyna's claim than Kazimierz likes to admit — or the other way, if you squint. Either way, it's a boundary mark.

- A: "This stone counts." → evidence +1 (boundary stone); can press Kazimierz with `askedStone`.

**Discovery — Oak age** (Survival)

> *(self)* The trunk's rings and lean say the oak stood here before either man's story was finished. Age alone won't crown a winner — but it undercuts "always ours" talk.

- A: "Note the age against both claims." → evidence +1 (oak age).

When evidence ≥2 → ready for stage 2 deal talks.

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
- C: "Leave the oak. Take beams from trees that don't guard the ditch." → if evidence ≥2: `deal=peace`; `stage=3`; else Kazimierz: "Bring proof first."

**Dialog — Sołtys (mediation beat, after evidence ≥2)**

Role-tag: either Domowice's sołtys (**Radosław**) or Brzeżyna's sołtys — whoever hosts the boundary talk. Not Janko. Introduce on first speak: "sołtys — village head."

> Sołtys: "Two villages, one trunk. I'm sołtys here — village head — and I can write a verdict without starting a feud. Speak."

- A: "Peace — oak stands; each side takes two trees elsewhere." → if evidence ≥2: `deal=peace`; `stage=3` (prefer `framedAsDispute`); else sołtys: "Bring two marks first."
- B: "The marks favor Domowice." → `deal=home`; `stage=3`.
- C: "The marks favor Brzeżyna." → `deal=brz`; `stage=3`.
- D: *(decline mediation; later theft)* "No verdict today." → leave without deal; theft remains available as a night action; stay stage 2.

Set `deal`; `stage=3`.

**Discovery — Night theft** *(if player chooses theft)*

> *(self)* Axes in the dark. The boundary oak falls. Wood for the taking — and two villages will smell the sap at dawn.

- A: "Fell it and haul the logs." → `deal=theft`; `stage=3`; honesty risk already in reward row.
- B: "Leave the oak. Find another way." → cancel theft; return to deal options.

### Stage 3 — Rewards

**Dialog — Mirosław (closing)**

> Mirosław: "Say it plain. Does the oak stand, fall for us, fall for them — or did someone already swing in the dark?"

- A: *(deal=peace)* "Oak stands. Each side takes two trees elsewhere." → apply peace rewards; clear `roadActive`; `done`.
- B: *(deal=home)* "The marks favor Domowice." → apply home rewards; clear `roadActive`; `done`.
- C: *(deal=brz)* "The marks favor Brzeżyna." → apply brz rewards; clear `roadActive`; `done`.
- D: *(deal=theft)* "The oak's already down. Here's the wood." → apply theft rewards; clear `roadActive`; `done` dirty.

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
