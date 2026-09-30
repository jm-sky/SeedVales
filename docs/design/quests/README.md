---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: pass-with-nits
provider_reviews:
  - note: Prior Polish pack completed PL rounds 1–3 (pass-with-nits; R3 econ fixes applied). This English rewrite starts a new review wave.
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

# Design: Starting Quests (English pack)

Eight authored multi-stage narrative quests for SeedVales-2, set between **Domowice** (the player's **starting/home settlement**, sometimes abbreviated **SM** in older notes) and **Brzeżyna** (neighbor settlement, roughly **1 day** of travel on the road).

**Language note:** These design docs are **English only**. Polish proper names (Domowice, Brzeżyna, Mira, Miki, Siwy, …) are kept and introduced clearly on first mention. In-game player-facing UI may stay Polish later; implementers should treat this pack as the English design source of truth.

Existing code quests (rats / wolves board posts in `quests.ts`) are separate sim-driven content. These documents describe authored multi-stage narrative quests for later implementation.

ASCII file slugs: `grok-quest-NN-english-slug.md`.

**Dialog coverage (DIALOG rounds):** Each quest now has an explicit **Opening (giver)** ask (who wants what, why it matters) before deeper briefing, plus spoken NPC dialog blocks with `→` effects for mid-stage and return/closing beats. Environmental actions may stay table-ish with a short discovery line.

---

## Quest index

| ID | English title | File | Typical start | Takes `roadActive`? |
|----|---------------|------|---------------|---------------------|
| 01 | Lost Lamb | `grok-quest-01-lost-lamb.md` | Day 1–3 | No (yes only on optional Wanda branch) |
| 02 | Rusty Debt | `grok-quest-02-rusty-debt.md` | Bogdan relation ≥5 or Domowice honesty ≥5 | Yes from stage 2 |
| 03 | Night Torches | `grok-quest-03-night-torches.md` | Night 1–3, local | No |
| 04 | Root by the Stream | `grok-quest-04-root-by-the-stream.md` | After first night; 2-day timer | Yes |
| 05 | Disputed Oak | `grok-quest-05-disputed-oak.md` | After first visit to Brzeżyna | Yes |
| 06 | Trader's Letter | `grok-quest-06-traders-letter.md` | Stanisław relation ≥10 or trade skill ≥20 | Yes |
| 07 | Trail of Siwy | `grok-quest-07-trail-of-siwy.md` | After first night | No |
| 08 | Well and Rumor | `grok-quest-08-well-and-rumor.md` | Honesty ≥5 or Radosław relation ≥10 | Only on Brzeżyna accusation path |

---

## Casting budget

Quest-critical **home adults in Domowice** are capped at **5 reserved** names: Mira, Bogdan, Wojciech, Dobrawa, Jarosław.

| NPC / role tag | Profession | Quests |
|----------------|------------|--------|
| **Mira** | shepherd | 01 (giver) |
| **Bogdan** | blacksmith | 02 (giver) |
| **Wojciech** | guard | 03 (giver); witness in 01; dog motif in 07 |
| **Dobrawa** | herbalist | 04 (giver); medical opinion in 08 |
| **Jarosław** | hunter | 07 (giver) |
| `sett.woodcutter` → **Mirosław** | woodcutter | 05 (giver) |
| `sett.trader` → **Stanisław** | trader | 06 (giver) |
| `sett.soltys` on a farmer → **Radosław** | village head (sołtys) | 08 (giver) |
| Anna / Halina + Marta / Maciej / Tomasz | non-lock extras | 02 / 03 / 04 / 08 |

**Brzeżyna casting:**

| NPC | Role | Notes |
|-----|------|-------|
| **Kazimierz** | reserved antagonist | Quest 05 only |
| **Janko** | cartel / shady partner | **Central only in quest 06** — do not cast him as a major actor elsewhere in this pack |
| Wanda | role-tag (not reserved) | Optional false-ID beat in 01 |
| Sołtys of Brzeżyna | role-tag | Quest 02 debtor / treasury gatekeeper |
| **Piotr** | wanderer | Quest 01 thief — not settlement-locked |

---

## `roadActive` mutex

`q.roadActive` is a **shared lock**: at most **one** of the following may be active at a time:

- Quest **02** from stage 2 onward (travel to Brzeżyna)
- Quest **04** (herb run / road travel)
- Quest **05** (boundary oak dispute)
- Quest **06** (letter delivery)
- Quest **08** **only** if the player takes the Brzeżyna **accusation** path

Quests **01**, **03**, and **07** normally do **not** take `roadActive`. Exception: if the player walks Miki to Wanda in Brzeżyna during 01, set `roadActive` for that branch.

When a quest that holds `roadActive` completes, fails, or is abandoned, clear the flag so another road quest can start.

**Start rule:** If `roadActive` is already true, the player **cannot** start (or enter the road stage of) quests 02, 04, 05, 06, or the 08 accusation path, and cannot open the quest 01 Wanda branch. Show a short refusal ("The road's spoken for — finish the other errand first."). Do **not** queue a second road quest.

**Soft-link (wolves / dog):** Quests 03 and 07 share one remembered dog — **Szarik**, belonging to **Marta** (Halina's mother). Do not invent a second named dead dog for this pack.

---

## Glossary (effect / money / flag vocabulary)

Use these terms consistently in design docs and code. Every payout must name a real purse or treasury — **never mint money from nowhere**.

### Money

| Term | Meaning |
|------|---------|
| **copper coins** | The smallest currency unit. Polish colloquial *miedziaki* ("m"); design docs always write **copper** or **copper coins**, never bare `m`. |
| `from: <purse>` | Deduct the listed amount from that purse/treasury and give it to the recipient named in the reward row. |
| `to: <purse>` | Player (or NPC) pays into that purse. |
| `mira_purse`, `bogdan_purse`, `dobrawa_purse`, `stanislaw_purse`, `jaroslaw_purse`, `janko_purse`, `marta_purse`, `tomasz_purse`, `soltys_purse` | Personal NPC purses. |
| `treasury_home` | Domowice settlement treasury. |
| `treasury_brzezyna` | Brzeżyna settlement treasury. |
| `from: player` | Deduct from the player character's inventory / coin purse. |
| `if_empty: <fallback>` | If the primary purse cannot cover the full amount, pay what it has (or the stated max) from the fallback. Prefer **partial** over inventing coins. |
| Money conservation | Every copper paid out must come from a named `from:` source. Quest 06 cartel fee is **only** from `stanislaw_purse`, never `treasury_home`. Quest 04 final pay **subtracts** any advance already taken. |

### Stage flags and quest state

| Term | Meaning |
|------|---------|
| `qNN.stage` | Integer stage counter for quest NN (1, 2, 3, …). Usually only increases. |
| `roadActive` | See mutex section above. |
| Bool / enum flags | Written as `q01.hasLead`, `q02.deal=U`, etc. Defined per-quest in that file's flag glossary. |
| `if_empty` | Money fallback rule (see Money). |
| `sett.woodcutter` / `sett.trader` / `sett.soltys` | **Settlement role tags.** At cast time the sim resolves each tag to a concrete NPC (Mirosław, Stanisław, Radosław, …). Design docs name both the tag and the resolved person. |
| `sołtys` | Polish title for **village head**. Keep the word; gloss as "village head" on first use in each quest file. |
| `q04.status=done` / `q04.active` | Cross-quest: quest 04 finished successfully vs currently in progress. Used by quest 07 poison gate. |

### Reputation axes (settlement-scoped unless noted)

| Axis | Plain meaning | Typical range effect |
|------|---------------|----------------------|
| **helpfulness** (*uczynność*) | Seen as someone who aids neighbors | ±N on Domowice and/or Brzeżyna |
| **honesty** (*uczciwość*) | Seen as truthful / not a cheat | ±N |
| **courage** (*odwaga*) | Seen as willing to face danger | ±N |
| **renown** (*sława*) | Name known beyond the village | ±N |

### Relations / opinions

| Term | Meaning |
|------|---------|
| **relation** / **opinion** | Numeric attitude of one NPC toward the player, roughly **−100 … +100**. Written as `Mira+30` or `Wojciech−10`. |
| Gate like `Bogdan≥5` | Relation (or named axis) must be at least that value to start or unlock a branch. |

### Dialog effect tags

After each player reply option, a `→` lists mechanical effects. Vocabulary:

| Tag pattern | Meaning |
|-------------|---------|
| `stage=N` | Set this quest's stage to N. |
| `Name+N` / `Name−N` | Change relation/opinion with that NPC. |
| `helpfulness+N`, `honesty−N`, … | Change a reputation axis (scope named in the quest if ambiguous). |
| `from: purse AMT` | Money transfer as above. |
| `flag=value` | Set a quest flag. |
| `item X×N` | Grant or require inventory items. |

---

## How to read a quest file

Each quest file uses the same section order:

1. **Title + one-sentence premise** — who wants what, and why it matters.
2. **Meta table** — level/gates, stage count, settlements, giver, other cast, `roadActive`, inspiration.
3. **Characters** — every named person/animal introduced with role and why they matter.
4. **World truth** — what is actually true in the fiction (implementers and writers share this; the player discovers it).
5. **Stage rules / flags glossary** — flags local to this quest.
6. **Stages** — clear NPC dialog lines + player options with `→` effects. Prefer full spoken sentences.
7. **Rewards** — tables with full words for money sources (`from: mira_purse`, never silent minting).
8. **Mechanisms** — Required / Stub / Out of scope for implementers.

---

## Mechanisms (pack-wide)

| Need | Required | Stub (acceptable simplification) | Out of scope (v1) |
|------|----------|----------------------------------|-------------------|
| Stages / flags | Integer stage + bool/enum flags per quest | — | Full quest editor UI |
| Dialog | Conditional lines + player choices with `→` effects | — | Fully generative NPC chat |
| Letter (quest 06) | States `sealed` \| `opened` | Rumor delay of 1 day as a simple tick | Forgery, highway ambush |
| Assist (quest 07) | One-shot help at the den | — | Full companion / follower system |
| Prices / friction | `priceMod.grain`, `tradeFriction` flags | Numeric modifiers as simple scalars | Full diplomacy matrix |

---

## Design vision reminders

- Grounded medieval village simulation — **no fantasy magic**.
- Preserve economic conservation and casting budgets from the reviewed Polish pack (PL rounds 1–3).
- Clarity over cleverness: every named animal, NPC, and item must be understandable on first mention.
