---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — cast/places aligned with QUEST-WORLD.md, roadActive removed, Wanda branch cut
---

# 01 — Lost Lamb

**Premise:** Molly Lambert the shepherd wakes to find her lamb **Pip** gone and the pen latch eased open, not broken. A hungry wanderer on the road has the lamb and a ready story about finding a stray.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Dialog uses `{H}` / `{V}` for generated settlement names.

## Meta

| Field | Value |
|-------|-------|
| Scale | Small starter quest, H only |
| Start | Calendar day 1–5, Molly alive, Piers Walker camping on the local road |
| Stages | 3 |
| Giver | **Molly** (H shepherd) |
| Others | **Mark Hornblower** (H guard, witness), **Piers** (wanderer), **Tom Lambert** (Molly's husband, one line) |
| Mechanics status | I: dialog with NPC, reputation, trade, sneak. N: quest stages/flags, item `lamb_miki` (a live animal that follows the player), evidence flags |

## Characters

- **Molly** — shepherd; knows her latch by feel and won't accept "a wolf did it" without proof. Quick, warm, sharp when worried.
- **Pip** — Molly's lamb with a small brass bell on a cord. Alive with Piers.
- **Tom** — Molly's husband; slept through it and is embarrassed about that.
- **Mark** — H guard; saw a stranger on the cart road before first light.
- **Piers** — wanderer, thin and hungry, heading for the market in {V} with a lamb to sell. Not violent; ashamed when cornered; would rather talk than run.

## World truth

At dawn Piers eased Molly's latch, led Pip out on a cord and walked off toward {V}. He camps by the ford on the local road, waiting for the morning market cart. The scuffs near the pen were made by a fox worrying a hare carcass the night before — they look like a struggle to an untrained eye. There was no wolf.

## Flags

| Flag | Meaning |
|------|---------|
| `q01.stage` | 1 → 2 → 3 |
| `q01.leads` | Set of `latch` (Molly), `witness` (Mark), `prints` (inspect pen: boot prints beside small hooves, no drag marks) |
| `q01.misreadWolf` | Player inspected the pen with low Survival and concluded "wolf" |
| `q01.resolved` | `evidence` \| `paid` \| `taken_back` \| `guard` |
| `q01.piersWork` | Molly offered Piers a day's work (only after `evidence`) |

`lamb_miki` follows the player once recovered (N: leash/follow for a single animal).

## Stage 1 — The open pen

**Opening — Molly at the pen**

> **Molly:** Pip's gone. My lamb — the little one with the brass bell. The latch is up and the gate's shut behind her. Nobody shuts a gate behind themselves by accident.
> **Player:** Could she have got out on her own?
> **Molly:** And closed it after? No. Somebody walked her out.
> **Tom:** *(from the door)* I didn't hear a thing. I'm sorry, Molly.
> **Molly:** You never hear anything, love. That's not your fault, it's your ears.

- A: "I'll find her. Tell me everything." → quest starts; Molly+5; go to Briefing.
- B: "What's it worth to you?" → Molly: "Fifteen coppers, and two fleeces when you bring her back. It's what I've got." → quest starts; go to Briefing.
- C: "Wolves come down this time of year." → Molly: "Wolves don't lift latches. Come and look." → quest starts; go to Briefing.
- D: "I can't now." → refuse; quest stays open while Pip is still missing.

**Briefing — Molly** → `leads+=latch`

> **Molly:** Feel this latch. You lift it and slide it — it doesn't swing up on its own, it's too stiff. And listen for the bell. It's not a cow bell, it's high and thin. If you hear that on the road, that's her, not the wind.

- A: "Don't go accusing anyone till I'm back." → Molly: "I won't. I'll just think it very loudly." → `stage=2`
- B: "Who's been past lately?" → Molly: "Carters for the market. A man I didn't know yesterday evening, asking for water. Thin. Polite." → `stage=2`

**Mark (optional)** → `leads+=witness`

> **Mark:** Before first light, on the cart road, a man went by with a pack and something on a cord. I took it for a dog. He walked quick for someone with nowhere to be.

- A: "Thanks. I'll keep it quiet till I'm sure." → Mark+5.
- B: "Come with me and arrest him." → Mark: "For walking a dog? Bring me something firmer and I'll come." *(unlocks `guard` outcome once player has ≥2 leads)*

**Inspect the pen (optional, Survival check)**

- Strong: *Two sets of tracks leave the gate together — small hooves, and boots beside them. Nothing was dragged.* → `leads+=prints`
- Weak: *Torn fur and churned mud by the fence. Something fought here.* → `misreadWolf=true` (the player can still go to Molly with "wolf" — see below)

If the player tells Molly "a wolf took her" (`misreadWolf`):

> **Molly:** Then show me the blood. There's always blood with a wolf. *(silence)* No? Then it wasn't a wolf. Go and look on the road.

No penalty; `stage` stays 1 until the player gets any lead.

## Stage 2 — The man by the ford

Piers sits by a small fire. Pip is tied to a willow, bell tinkling. He stands up when the player arrives.

> **Piers:** Morning. You'll be from {H}? I found this one wandering on the road at dawn. Thought I'd keep her safe till someone came asking. Feeding her's cost me, mind — a finder's fee wouldn't be out of place.

**With 2+ leads** (any combination):

- A: "Molly's latch was lifted, not broken. Mark saw you on the road with her on a cord. And your boot prints are next to her hoof prints all the way from the pen." *(uses whichever leads the player has)* → Piers goes quiet, then: "…I was going to sell her in {V}. I haven't eaten properly in four days. I'm not a thief, I just — I am one, this morning. Take her." → `resolved=evidence`; gain `lamb_miki`; `stage=3`.
- B: *(if Mark agreed to come)* "Mark's on his way. You can explain it to him." → Mark arrives, walks Piers to the edge of {H} and tells him not to come back. → `resolved=guard`; gain `lamb_miki`; `stage=3`.

**Any number of leads:**

- C: "Here's your fee. Ten coppers." → `from: player` 10 → Piers; Piers: "Ten's fair. She's a good lamb." → `resolved=paid`; gain `lamb_miki`; `stage=3`.
- D: *(night, Sneak)* Wait until Piers sleeps and untie Pip. → `resolved=taken_back`; gain `lamb_miki`; `stage=3`. If spotted: Piers: "Hey! — oh. Hers, is it. Go on, then." (same result; Piers+0).

**With 0 leads:**

- E: "Where exactly did you find her?" → Piers: "Up the road a way." → no progress; player can return with leads.

## Stage 3 — Home

**Molly — the lamb is back**

> **Molly:** *(hears the bell before she sees them)* That's her. That's — come here, you idiot sheep. *(to the player)* Where was she?

- A: *(resolved=evidence)* "A wanderer had her. Piers. He was going to sell her in {V} — he hadn't eaten in days." → Molly: "Hadn't eaten." *(long pause)* "…Is he still by the ford? We've a fence wants mending. A day's work for a day's food. If he steals the hammer, I'll know who to blame." → `piersWork=true`; apply reward row `evidence`.
- B: *(resolved=paid)* "I paid him a finder's fee to hand her over." → Molly: "You paid him for my lamb? …Well. She's back. Let me give you the fee back at least." → apply reward row `paid`.
- C: *(resolved=taken_back)* "I took her back while he slept." → Molly: "Good. I'd have done the same, only louder." → apply row `taken_back`.
- D: *(resolved=guard)* "Mark's sent him on his way." → Molly: "Good riddance. And thank Mark for me — no, I'll take him a cheese myself." → apply row `guard`.

## Rewards

| resolved | Money | Items | Reputation (H) | Relations |
|----------|-------|-------|----------------|-----------|
| evidence | `from: molly_purse` 15 (`if_empty:` pay what's there) | wool×2 | helpfulness+10 | Molly+30 |
| paid | `from: molly_purse` 15 + refund of the 10 paid to Piers (`if_empty:` partial) | wool×2 | helpfulness+5 | Molly+20 |
| taken_back | `from: molly_purse` 15 | wool×2 | helpfulness+8, courage+3 | Molly+25 |
| guard | `from: molly_purse` 15 | wool×2 | helpfulness+8 | Molly+20; Mark+10 |

**Epilogue `piersWork`:** Piers mends Molly's fence for a day (N: temporary NPC labour), eats with the family, and leaves for {V} next morning. Later in {V} the player may meet him again working at the smithy bellows (flavour line only, no quest).

## Refusal, interruption, missing NPCs

- If the player never comes, Piers sells Pip at the {V} market after 2 days; Molly's opinion of the player doesn't change (they never promised). If the player accepted and didn't come back, Molly−5.
- If Piers is killed or chased off by animals, Pip stays tied at the ford; the player can simply bring her home (`taken_back`).
- If Molly dies, Tom receives the lamb and pays from the household purse.
- Attacking Piers is possible through normal combat; it is a crime against a human under normal reputation rules and is not an authored outcome.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Stages and leads; `lamb_miki` follow; payment from named purse; Survival check result |
| Stub | Piers's fence work as a one-day scripted presence |
| Out of scope | Blood-trail minigame; court/punishment system |
