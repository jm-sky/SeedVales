# Quest 13 — The Ash House Vault

**Status:** proposal (N); pack C (Codex round 2, treasure). Reworked 2026-10-01 — see [REVIEW-2026-10-01](REVIEW-2026-10-01.md). Cast and places: [QUEST-WORLD](QUEST-WORLD.md).

**Premise:** Irene Taylor, a seamstress in {T}, is the last of the family that owned Ash House — a manor in the woods half a day from town, ruined since a fire sixty years ago. Her grandmother always said the house "kept its winter money where fire couldn't reach it." Irene is in debt and has never dared go out there. Samuel Carpenter, the carpenter who'd tell her if the walls are worth saving, agrees to come. Neither knows that Samuel's own great-grandfather worked at Ash House the winter it burned.

## Intended feel

A ruined house becoming readable room by room; a cellar no one has entered in sixty years; a real fortune in a small iron vault; and a surprise in the paperwork that turns a treasure split into a question of who was owed what.

## Meta

| Field | Proposal |
|---|---|
| Scale | Treasure expedition, woods near {T} |
| Start | Player has reached {T}; Irene alive |
| Giver | **Irene** (T, seamstress) |
| Others | **Samuel** (T woodcutter-carpenter), **Percy Clark** (town scribe; parish/cemetery book), **Silas Moneypenny** (T merchant, buyer) |
| Animal | a **stag in rut** holding the old orchard (I: stag; N: seasonal aggression) |
| Stages | 5 |
| Locations | Ash House ruins (landmark "manor ruin", P `WORLD-11`), family graves on the hill, the orchard, the cellar vault |
| Main finds | 180 c in old coin; two cut rubies; a high-quality reinforced leather cuirass; the deed; a wage packet for three winter workers |

## Characters

- **Irene** — fifties, sharp-eyed, funny when nervous; her debt is ordinary (a bad year, a sick husband) and that's what frightens her. Wants the house to mean something, and also wants to sleep at night.
- **Samuel** — big, slow-spoken, thinks with his hands; judges a ruin by its timbers, not its history.
- **Percy** — the scribe; delighted by old paper, honest about what it does and doesn't prove.
- **Silas** — will buy a ruin if the title's clean; has no romance about it.

## World truth

The Ash family lost the house in a winter fire sixty years ago. The last owner, Hester Ash, kept a reserve in an iron vault in the cellar to pay wages over winter. After the fire she moved to {T}; her wages for that winter were never paid because the vault was buried under the collapsed stairs. One of the three unpaid winter hands was **Samuel's great-grandfather**. The vault holds: 180 c in old coin, two rubies (120–250 c each), a fine reinforced leather cuirass (Hester's brother's; 120–180 c), the deed (to Hester's line — Irene), and a sealed packet: "Winter wages, owed: Bartholomew, John, Walter — 20 c each."

## State

`q13.accepted`, `q13.gravesRead`, `q13.orchard = unset|waited|around|faced`, `q13.cellarShored`, `q13.vaultOpen`, `q13.packetRead`, `q13.slawomirKnows`, `q13.choice = unset|rebuild|clear_debts|sell`, `q13.settled`.

## Stage 1 — The house people stopped mentioning

**Irene at her sewing bench**

> **Irene:** Ash House. My great-grandmother's. Don't look like that, it's a ruin — you'd walk past it. *(pause)* My grandmother always said Hester "kept the winter money where the fire couldn't reach it." I thought it was a saying. Then the moneylender came round for the third time this month and I thought — what if it isn't?
> **Player:** You want me to look.
> **Irene:** I want somebody to come with me who isn't a moneylender or a man who'll fall through the floor. Samuel's agreed to look at the walls. You — you look at everything else.

- A: "I'll come." → `accepted`.
- B: "If there's money, what's my share?" → Irene: "A fair one. I'll not haggle with someone before they've walked a step. If there's nothing, I'll owe you a shirt." → `accepted`.
- C: "Not now." → Irene: "The moneylender won't wait, but I suppose I'll have to."

**Percy (optional)** → `gravesRead` (or read the stones themselves on the hill)

> **Percy:** The Ash graves are on the hill behind the house. The book here has the names — Hester, her brother, her daughter. And a note in the margin I've never understood: "the winter hands unpaid, the stair fallen." *(looks up)* I always assumed it meant the house was too ruined to pay anyone from. Perhaps it meant something more literal.

## Stage 2 — The road and the orchard

**On the overgrown track** — raised roadbed through wet woods; ash trees lining it.

> **Samuel:** Someone built this properly. Drained both sides. That's money, a road like this.
> **Irene:** Grandmother called it the ash road. Because of the trees.
> **Samuel:** I'd have called it the dry road. But then, I'm a carpenter.

**The orchard** — old apple trees gone wild, windfalls everywhere; a stag with a heavy rack roaring at the edge; scraped bark, churned ground.

> **Samuel:** That fellow's in no mood for visitors. Rut.
> **Player:** We need to get past.

- **Wait** — he moves off at dusk to his hinds → `orchard=waited` (time).
- **Around** — the old garden wall on the far side, slower, scratchy → `orchard=around`.
- **Face him** — he charges; dangerous (I: combat; stag can knock down) → `orchard=faced`.

## Stage 3 — The house

**At the gate** — the Ash leaf carved on the gatepost.

> **Irene:** *(touches it)* That's on Grandmother's thimble. The same leaf.
> **Samuel:** *(slapping the wall)* Stone's good. Roof's gone, floors are gone where the fire was. The kitchen wing's sound. — See the cellar stair? Under all that.

**The cellar** — the stair is buried under fallen beams and stone. Samuel: "We shore it before we dig, or we're the next thing buried." Needs 2 straight poles and wedges (cut nearby; I: woodcutting) → `cellarShored`. Digging without shoring: collapse risk (I: injury; N: structural event); progress isn't lost, but the player takes damage and must shore it anyway.

**The vault** — a squat iron door in the cellar wall, the Ash leaf on it, rusted shut. Levering it open takes time and a tool (crowbar/pickaxe, I). → `vaultOpen`

> **Irene:** *(very quiet)* Oh.
> **Player:** Coins. Two red stones. A leather coat — no, armour. A tube. And a packet.
> **Samuel:** *(low whistle)* Your grandmother wasn't telling stories, then.

## Stage 4 — The packet

> **Irene:** *(reading the packet)* "Winter wages, owed: Bartholomew, John, Walter. Twenty each." *(pause)* They never got paid. The fire, and then the stair —
> **Samuel:** *(he has stopped moving)* Read that again.
> **Irene:** Bartholomew, John, Walter.
> **Samuel:** Walter was my great-grandfather. *(sits down on a stone)* My grandmother used to say the Ash winter was the year they ate the seed corn. Because there was no pay. I thought it was a story.

→ `packetRead`, `slawomirKnows`.

- A: "Then twenty of it was always his family's." → Irene: "Of course it was. Of course." (sets up all endings with Samuel paid)
- B: *(say nothing)* → Irene decides on her own: she pays it anyway. (Same.)

The deed in the tube names Hester's line — Irene — as owner of the house and land.

## Stage 5 — What to do with Ash House

Back in {T}, Irene lays it all out on her cutting table.

> **Irene:** Twenty to Samuel — that's not a question. The rest… I could pay the moneylender with half the coins and still have the stones. Or I could keep the stones and put the house back on its feet. Or sell the lot — house, land and all — and never think about it again.
> **Silas:** *(who has been told)* I'd buy the land and the ruin. Four hundred, clean title. I might make a hunting lodge of it. I might not.
> **Samuel:** The kitchen wing could be roofed by spring. A waystation on the {T} road — travellers, carters, a dry bed. It'd pay. Slowly.

**What's the player's share?** Irene offers the player a choice of **one ruby, or the cuirass, or 100 c in coin** as their share, in every ending (proposed values: ruby 120–250, cuirass 120–180).

- **rebuild** — "Keep the house. Let Samuel roof the kitchen wing as a waystation."
  > **Irene:** And pay for it with — one ruby, and the coins after the moneylender. *(laughs, a bit wildly)* I'm going to own an inn. Of sorts.
  > **Samuel:** A waystation. Inns have beer.
  > **Irene:** Then it'll have beer.
- **clear_debts** — "Pay every debt — yours, Walter's, Bartholomew's and John's if their families can be found — and keep the house as it is for now."
  > **Percy:** I can put a notice in the town book for the other two families. Somebody will remember a grandfather called Bartholomew.
  > **Irene:** And the house waits. It's waited sixty years.
- **sell** — "Sell to Silas. Clear the debt and keep the stone you like best."
  > **Irene:** *(long look at the ash leaf on the deed)* …Four hundred. The debt gone tomorrow. And no house to worry about at night. *(pause)* Grandmother would've hated it. Grandmother never had a moneylender.

→ `choice`; `settled`.

## Endings

### E1 — The Ash Waystation (`rebuild`)
Condition: Samuel's crew works through winter (N: construction over time; player can bring timber to speed it). **World:** a new rest-stop on the {T} road (N: a small building with a bed and fire, usable by the player and travelling NPCs). Irene's debt cleared from the coins; one ruby sold to fund the roof.

> **Samuel (spring):** Kitchen wing's roofed. Chimney draws. *(hands the player a key)* Irene said you get a bed here whenever you're passing. No charge.

**Player:** chosen share + free lodging at the waystation (N).

### E2 — Wages paid (`clear_debts`)
Condition: Samuel paid 20 c; notices posted; Bartholomew's descendant is found after a week (a {T} farmer household, N) and paid; John's line is never found — his 20 c stays in the town book as a standing claim. **World:** the house stays a ruin; Irene debt-free, keeping whatever valuables the player didn't take as her savings.

> **Irene:** I paid people I've never met for work done before my mother was born. *(pause)* It felt better than paying the moneylender.

**Player:** chosen share; +renown and honesty in {T} (the notice names the finder).

### E3 — Sold (`sell`)
Condition: Silas pays **400 c** (`from: silas_purse`) to Irene; Samuel paid 20 c. **World:** Silas owns the ruin (may become a private hunting lodge later, N); Irene wealthy by {T} standards and gone from the moneylender's books.

> **Silas:** You found it, the lady sold it, I bought it. *(to the player)* That's the shortest story I've been part of this year.

**Player:** chosen share; Irene adds **50 c** from the sale as thanks (largest total cash outcome).

## Refusal, interruption, missing NPCs

- Going alone without Irene: the vault can be found and opened; the contents are Irene's property (the deed proves it). Keeping them is theft under ordinary rules; Percy's margin note and Irene's story make it likely to come out.
- If Samuel is unavailable, any carpenter-woodcutter of {T} can shore the cellar, but the packet scene loses its twist (Walter's descendant is then found via the notice, as in E2).
- If Irene dies, the house passes to nobody listed; Percy records the find; the town treasury takes custody (N).
- The rubies and cuirass exist once. No respawn.

## Mechanisms

**Required:** landmark ruin with a buried cellar; shoring as a construction step; fixed vault contents; player's share choice; named payments.
**Stub acceptable:** waystation as a simple building flag + bed; notices as journal entries.
**Out of scope:** genealogy search; property law.
