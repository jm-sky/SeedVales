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

# 07 — Trail of Siwy

**Premise:** Hunter **Jarosław** asks the player to end the threat of **Siwy**, a named grey wolf that keeps returning to Domowice's doorstep after lesser wolves are driven off.

## Meta

| Field | Value |
|-------|-------|
| Level | After first night |
| Stages | 3 |
| Settlements | Domowice / local forest (no Brzeżyna road lock) |
| Giver | **Jarosław** (hunter) — reserved |
| Assist | **One-shot** help at the den if the player chose "together" — not a companion system |
| Poison gate | Method **P** only if `q04.status=done` **and** Dobrawa relation ≥10 **and** `q04.active` is false (quest 04 not in progress). See README glossary for these flags. |
| `roadActive` | **No** |

## Characters

- **Jarosław** — Domowice hunter; quest giver; respects clean kills and traps more than poison.
- **Siwy** — Named grey wolf (not a generic pack animal). Leaves a distinctive trail "like a signature." Can be killed, trapped, driven off for a season (non-lethal), or poisoned.
- **Wojciech** — Guard; can provide a fur/scratch clue near the posts (shared cast with 01/03, no start block).
- **Dobrawa** — Gatekeeper for poison method via quest 04 completion and relation (she does not appear as a hunter here).

## World truth

Ordinary wolves can be scared with noise. **Siwy** returns. The den is a quest-marked location. Poison is available only after the herbalist quest line is complete and Dobrawa trusts the player — and Jarosław will hate learning of it.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q07.stage` | 1 → 2 → 3 |
| `q07.clues` | Counter; need **≥2** clues before method choice / assist is offered |
| Clue kinds | Fur/scratch via Wojciech; howl / trail marker in the woods; quest den discovered |
| `q07.method` | Exclusive: `H` fight/bow \| `T` trap \| `N` non-lethal drive-off \| `P` poison |
| `q07.assist` | Bool; **one-shot** at the den. **Only offered after clues ≥2** (see stage order below). |
| Item `grey_pelt` | On lethal successful H/T |

**Order clarification (EN fix):** Do **not** offer the "meet me at the den at dawn" assist line until `q07.clues ≥ 2`. Stage 1 is clue gathering; stage 2 opens method + assist.

---

## Stages

### Stage 1 → 2 (clues ≥2)

**Dialog — Jarosław (hunter), quest offer**

> Jarosław: "You can scare a pack off with noise. Siwy — the grey one we call by name — comes back to the door. He leaves a trail like a signature. Bring me two true signs before we talk steel or mercy."

- A: "I'll start at Wojciech's posts and the tree line." → `stage=1` active; hunt clues.
- B: "If he can leave without blood, I'll take that door too." → note preference; still need clues ≥2 before method N unlocks in stage 2.

Clues (need ≥2):

1. Wojciech shows fur / claw marks on a torch post or shed.
2. Howl marker / print trail in the local woods (Survival or follow).
3. Discover the quest den location.

When clues ≥2 → `stage=2`.

**Dialog — Wojciech (clue beat)**

> Wojciech: "Whatever hit this post wasn't a farm dog. Grey hair in the splinters. Smells like the same trouble that took Marta's Szarik — maybe not the same beast, but the same kind of night."

- A: "I'll carry that to Jarosław." → clue +1 (fur).

### Stage 2 — Method (exclusive) + assist gate

**Dialog — Jarosław (after clues ≥2)**

> Jarosław: "Two signs. Good. At the den we finish it. How?"

- A: "Meet me at the den at dawn." → `assist=true` (**allowed only now**, clues ≥2); proceed to method pick.
- B: "I go alone." → `assist=false`.
- C: "If he leaves without blood, that still closes our door." → unlock method `N`.
- D: *(if poison gate passes)* "Dobrawa’s craft can end this quiet." → unlock method `P`; if Jarosław learns you used it later: Jarosław−15.

| ID | Method |
|----|--------|
| **H** | Fight / bow (± assist one-shot at den) |
| **T** | Trap (traps skill) |
| **N** | Non-lethal (noise + fire) — Siwy **leaves for a season** |
| **P** | Poison (gate: `q04.status=done` + Dobrawa≥10 + not `q04.active`) — Jarosław−15 if he knows |

Resolve at den → `stage=3`.

### Stage 3 — Payout

**Dialog — Jarosław (closing)**

> Jarosław: "Is Siwy meat, trapped, gone to another valley — or did someone salt the quiet way?"

| Path | Payout | Item | Reputation | Relation |
|------|--------|------|------------|----------|
| **H** | `from: treasury_home` 30 (`if_empty: jaroslaw_purse` max 20) | `grey_pelt` | courage+10; renown+6 | Jarosław+30; Wojciech+15 |
| **T** | `from: treasury_home` 28 (`if_empty: jaroslaw_purse` max 18) | `grey_pelt` | courage+8; renown+6 | Jarosław+25 (values a clean trap) |
| **N** | `from: treasury_home` 15 (`if_empty: jaroslaw_purse` max 10) | — | helpfulness+5 | Jarosław+10 |
| **P** | `from: treasury_home` 20 (`if_empty: jaroslaw_purse` max 15) | — | honesty−5 if word spreads | Jarosław−15 |

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Entity/flag for Siwy (`wolf_grey`); den; assist one-shot after clues ≥2; full H/T/N/P payouts; poison gate |
| **Stub** | Optional Wanda hint line |
| **Out of scope** | Full companion system |
