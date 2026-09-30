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

# 03 — Night Torches

**Premise:** Child **Halina** has been putting out Domowice's night torches because she fears wolves will see the light — ever since the family dog **Szarik** was killed. Guard Wojciech needs the lights back without terrorizing the girl.

## Meta

| Field | Value |
|-------|-------|
| Level | Local night, calendar nights 1–3 |
| Stages | 3 |
| Settlements | Domowice only |
| Giver | **Wojciech** (guard) — reserved |
| Others | **Halina** (child); **Marta** (Halina's mother) — non-lock |
| Soft-link | Fear after dog Szarik died (only wolf soft-link alongside quest 07) |
| Ban | **No attack option on Halina** |
| Casting note | **No Jarosław** in this quest (hunter stays in 07) |
| `roadActive` | **No** |

## Characters

- **Wojciech** — Domowice night guard; quest giver who notices torches going dark.
- **Halina** — Child who extinguishes torches; believes darkness hides the village from wolves.
- **Marta** — Halina's mother; can be threatened (extort path) or comforted (empathy path).
- **Szarik** — Marta's family dog (Halina's household), already dead before the quest starts; remembered in dialog only. Same dog referenced as soft-link in quest 07 — do not invent a second named dead dog.

## World truth

Halina is extinguishing torches out of fear, not sabotage for hire. Wolves are a real regional threat, but putting out torches makes night worse for the guard, not safer for the child. Szarik's death is the emotional cause — do not invent a second conspiracy.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q03.stage` | 1 → 2 → 3 |
| `q03.caughtHow` | How the player finds Halina: `watch` \| `sneak` \| `morning` |
| `q03.childPath` | Exclusive: `empathy` \| `teach` \| `report` \| `extort` |

**Cash equalization (EN rewrite):** empathy and report both pay **20 copper** from `treasury_home` at close (report previously paid 25 in the Polish pack; equalized by design request).

---

## Stages

### Stage 1 → 2 (catch how)

One branch only:

- **Watch** with Wojciech on night duty → `caughtHow=watch`.
- **Sneak** alone and catch Halina at a torch → `caughtHow=sneak`.
- **Morning** trail with Marta pointing to soot / moved stools → `caughtHow=morning`.

**Dialog — Wojciech (guard), quest offer**

> Wojciech: "Third torch this week cold before midnight. Something small is climbing the posts. I want eyes, not a panic on the square."

- A: "I'll stand the watch with you tonight." → `caughtHow=watch`; `stage=2`.
- B: "I'll go quiet and catch them myself." → unlock sneak approach; on success `caughtHow=sneak`; `stage=2`.
- C: "I'll look at first light with Marta." → `caughtHow=morning`; `stage=2`.

### Stage 2 → 3 (`childPath`)

**Dialog — Halina (child), at a dark post**

> Halina: "When it's bright, the forest can see us. When it's dark, maybe they won't find us. That's what I told our dog Szarik… before he was gone."

- A: "A wolf sees in the dark anyway. Light bothers it more than it bothers us. Come — we'll ask Wojciech to show you why." → `childPath=teach`; Halina+15; `stage=3`.
- B: "We'll go to Wojciech together. I'll speak first so you aren't alone." → `childPath=empathy`; Halina+25; Marta+10; `stage=3`.
- C: "I'll tell the guard myself." → `childPath=report`; Halina−30; Marta−15; Wojciech+10; `stage=3`.
- D: *(to Marta, private)* "Ten copper coins — and I keep quiet about your daughter." → `from: marta_purse` 10 copper (`if_empty: 0`); Domowice honesty−25; `childPath=extort`; `stage=3`.

| ID | Choice | Immediate effects |
|----|--------|-------------------|
| A | Teach (Wojciech alone explains predators and torch light — **no Jarosław**) | Halina+15; `childPath=teach` |
| B | Empathy + walk together to Wojciech | Halina+25, Marta+10; `childPath=empathy` |
| C | Public report | Halina−30, Marta−15, Wojciech+10; `childPath=report` |
| D | Extort Marta | `from: marta_purse` 10; honesty−25; `childPath=extort` |

### Stage 3 — Close (different world outcomes per path)

**Dialog — Wojciech (closing beat)**

> Wojciech: "Torches are for the living. Tell me how this ends before I set the next watch."

Apply the row for `childPath`:

| childPath | World change | Payout |
|-----------|--------------|--------|
| **empathy** | Wojciech shortens gaps between torches; player contributes torch×2 (`from: player`, or `from: treasury_home` up to 2 if stock exists) | `from: treasury_home` **20** copper (`if_empty: partial`); helpfulness+12; honesty+5; Wojciech+20 |
| **teach** | Same torch spacing as empathy, but **no** treasury torch subsidy (player must supply torch×1 from inventory); Halina gets one daytime "board duty" helper shift | `from: treasury_home` **15** copper (`if_empty: partial`); helpfulness+8; honesty+8; Wojciech+15 |
| **report** | Halina banned from night square for 3 days; torch layout unchanged | `from: treasury_home` **20** copper (`if_empty: partial`); honesty+10; helpfulness−5 |
| **extort** | Problem returns; Wojciech finishes it himself / quest expires dirty | The 10 copper already taken; Wojciech−10; mark `done` dirty |

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Night or morning beat; `childPath`; torch items / spacing flag |
| **Stub** | Teach path = Wojciech dialog only (no hunter cameo) |
| **Out of scope** | Patrol AI; Jarosław appearing in 03 |
