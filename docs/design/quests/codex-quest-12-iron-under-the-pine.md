# Quest 12 — The Iron Under the Pine

**Status:** proposal (N); pack C (Codex round 2, treasure). Reworked 2026-10-01 — see [REVIEW-2026-10-01](REVIEW-2026-10-01.md). Cast and places: [QUEST-WORLD](QUEST-WORLD.md).

**Premise:** Old Dobromir of {T} was a road guard at Pinewatch forty years ago. When the avalanche came, his captain, Marek, dug him out and died doing it. Dobromir sealed Marek's sword in the stone locker under the watchtower and walked away from the mountains. Now he's old and wants it out of the dark before he dies. A bear sleeps in the cellar in front of it.

## Intended feel

A man's memory as the map; a long climb; a ruin with a bear in it; a superb weapon in the hands at the end — and a choice whether it stays in the player's hands.

## Meta

| Field | Proposal |
|---|---|
| Scale | Treasure expedition, mountains beyond {T} (2–3 days from home) |
| Start | Player has reached {T}; Dobromir alive |
| Giver | **Dobromir** (T, elderly former road guard; lives with the guard household) |
| Others | **Wisława** (T guard, commands the road patrol), **Milena** (T hunter, mountain guide), **Przemysł** (town scribe, old guard register), **Zbigniew** (T merchant, buyer) |
| Animal | a **prime bear** denning in the outer cellar (I: bear, dens; P: prime variant `FAUNA-09`) |
| Stages | 5 |
| Locations | Pinewatch ruins (landmark N), the old military road, the cellar and the stone locker |
| Main finds | **Pinewatch Longsword** (masterwork longsword, proposed value 450–600 c); guard cache (iron-rimmed shield, three spearheads); Marek's company badge |

## Characters

- **Dobromir** — seventy-odd, hands that shake until they hold something; tells the same story with different details depending on the day, and knows it.
- **Wisława** — commands {T}'s road patrol; brisk, short sentences, wants every patrol to come home.
- **Milena** — guide; talks about wind, footing, smell. Hates hurry.
- **Przemysł** — keeps the old registers; finds the line Dobromir only half remembers.
- **Zbigniew** — buys weapons as he buys everything: on inspection, at a fair price, without sentiment.

## World truth

The sword was made for Captain Marek by a city smith and paid for by the road-guard company — which today is {T}'s guard. After the avalanche the road was abandoned. Dobromir put the sword, Marek's badge and the company's spare gear in the stone locker under the tower and closed it with a slab. A bear now uses the collapsed outer cellar as a winter den; the locker is behind a narrow stone partition the bear can't pass. The sword is in good condition (dry stone, oiled cloth).

## State

`q12.accepted`, `q12.registerFound`, `q12.routeFound`, `q12.towerReached`, `q12.bear = unset|slipped_past|driven|killed`, `q12.swordOut`, `q12.badgeOut`, `q12.cacheOut`, `q12.choice = unset|guard|sale|carry`, `q12.settled`.

## Stage 1 — An old man's map

**Dobromir on the bench outside the guardhouse**

> **Dobromir:** You're the one who goes places. Sit. No, sit, I talk better when people sit. *(pause)* Pinewatch. Up past the second ridge. There was a tower there, and a road, before the snow took them. And there's a sword in the tower that should've come down forty years ago.
> **Player:** Whose sword?
> **Dobromir:** Marek's. My captain. *(long pause)* He dug me out. Took him an hour and he got me out and then the second slide came. — I put his sword away myself. Thought somebody'd go back for it in spring. Nobody did. I didn't.
> **Player:** Why now?
> **Dobromir:** Because I'm old enough to count on my fingers how many springs I've got. I'd like to see it once more. Then the guard can have it, or you can — I don't care which. Just not the dark.

- A: "I'll go." → `accepted`.
- B: "What's the way?" → Dobromir: "Past the pine with the split top. Then the road — what's left of it — keeps to the left of the drop. If it's the right pine. It might be a different pine. It's been forty years." → `accepted`.
- C: "Not now." → Dobromir: "I'll be here. Probably."

**Przemysł (optional)** → `registerFound`

> **Przemysł:** Pinewatch… here. "One longsword, city work, for Capt. Marek, paid from the road account." And a later hand, shaky: "Sword and spare gear secured in the tower locker. D." *(looks up)* That's Dobromir's "D". He was nineteen.
> **Player:** Does that make it the guard's?
> **Przemysł:** It makes it the road account's, which is the guard's now. But Wisława's not one to snatch a sword off the person who carried it down a mountain. Ask her.

**Wisława (optional)**

> **Wisława:** Dobromir's sword? He's told me that story six times. *(pause)* I believed it four. If it's real, my north patrol could use a blade like that. If it isn't, I'd rather you didn't come back with a broken leg finding out. — Take Milena. She's the only one who's been past the second ridge this year.

## Stage 2 — The road under the moss

**Milena at the trailhead**

> **Milena:** Rope, lamp, food for three days, something warm for the nights. Snow's already on the tops.
> **Player:** Dobromir said a split pine.
> **Milena:** There are four split pines up there. We'll find the road first and the pine after.

Climb (I: terrain, stamina, cold weather). On the way:

- **The split pine** — the right one has old iron spikes driven into it at shoulder height: guard-road markers. → `routeFound`
- **The roadbed** — stone edging under moss, a sheer drop on the right. Milena: "Keep left. The road's fine. It's the edge that's tired."
- **A night camp** — (I: camp/fire). 

> **Milena:** *(by the fire)* My grandfather knew Marek. Said he was the sort who'd go back for a dropped glove in a blizzard. *(pokes the fire)* Which is how he died, I suppose.
> **Player:** Dobromir blames himself.
> **Milena:** Course he does. He's the one who lived.

## Stage 3 — Pinewatch

**The ruins** → `towerReached`. The tower has fallen inward; the cellar roof still holds. Musky smell, fresh scratches on the doorframe, a trampled bed of bracken in the outer cellar.

> **Milena:** *(whisper)* She's in there. Big one. Asleep, or nearly. Late autumn, she won't want to wake.
> **Player:** The locker?
> **Milena:** Behind that wall, if the old man's right. There's a gap at the top of the partition — see where the stones have fallen? From the tower floor above, with a rope, you could get down behind her wall without walking past her nose.

Options:

- **Slip past** — rope down from the broken tower floor (I: rope; Sneak check; noise from dropped items wakes the bear) → `bear=slipped_past`.
- **Drive her out** — fire and noise at the outer door (P: fear of fire). She leaves toward the ravine and may come back; Milena: "Don't stand where she wants to run." → `bear=driven`.
- **Fight** — a prime bear (I: combat; very dangerous). → `bear=killed`.

**The locker** — a stone slab over a niche; lever it up (two people, or rope + lever; Strength). Inside, wrapped in oiled cloth: the sword in a dark scabbard; a small brass badge with a pine; a shield and three spearheads wrapped in sacking.

> **Milena:** *(unwrapping)* Not a rust spot. Forty years.
> **Player:** *(draws a hand's width of blade)* It's — balanced like it was made yesterday.
> **Milena:** It was made for a man who walked this road every day. They don't make those pretty. They make them so they still work at the end of the day.

→ `swordOut`, `badgeOut`, `cacheOut` (cache is heavy; may need a second trip — Milena carries half).

## Stage 4 — Down the mountain

If `bear=driven`, she may be back on the path: one more encounter on the descent (wait, detour, or fight). If `slipped_past`, she sleeps on. If `killed`: hide and meat — far too much to carry with the cache.

## Stage 5 — Who carries it

**Dobromir, when the player puts the sword in his hands**

> **Dobromir:** *(silence; then he unwraps the badge first, not the sword)* …His badge. I forgot I put that in. *(holds it a long time)* I'll keep this. If nobody minds. — And the sword. *(he draws it a little, puts it back)* Well. There it is. It's been in the dark long enough.

**Wisława** (with Dobromir and Przemysł present)

> **Wisława:** The register says it's the guard's. The old man says he doesn't care. And you carried it down. So — tell me what you think should happen.

- **guard** — "Give it to your north patrol. That's what it was for."
  > **Wisława:** It'll be on the north road by the end of the week. Take something from the armoury in return — I mean it. The mail shirt, or the crossbow. Your pick.
- **sale** — "Sell it. Buy your patrol ordinary swords and armour with the money."
  > **Zbigniew:** *(inspecting)* City work, perfect condition, a story attached. Five hundred.
  > **Wisława:** Five hundred buys four good swords and the gate it needs. *(to the player)* A quarter is yours. You went up the mountain.
  > **Dobromir:** *(quietly)* Marek would've said four swords. He was practical.
- **carry** — *(requires Dobromir's opinion ≥ 30, or the player asks him directly)* "Let me carry it."
  > **Dobromir:** *(before Wisława can answer)* Let them. *(to Wisława)* It was made to be carried on a road, not hung on a wall or sold to a man who'll hang it on a wall. They carried it down. Let them carry it.
  > **Wisława:** *(after a moment)* …Then do something for the road with it. Walk my north patrol with them one week this winter. After that it's yours, and I won't ask for it back.

→ `choice`; `settled`.

## Endings

### E1 — Iron on the north road (`guard`)
**Player receives:** an armoury item of their choice — **Mail shirt (240) or Crossbow (180)** — as a real transfer from {T}'s guard stores (N: settlement armoury inventory) + `from: treasury_T` **40 c**. **World:** {T} road patrol gains the Pinewatch Longsword (N: guard NPC equipment upgrade); the spearheads and shield go to the guardhouse.

> **Wisława (later):** Three wolves on the north road last week. The patrol came home. All of them.

### E2 — Four swords (`sale`)
Zbigniew pays **500 c** (`from: zbigniew_purse`) to {T}'s guard; the guard pays the player **125 c** (a quarter). The guard buys four ordinary swords and mends the north gate (N: equipment and building improvement). **World:** the sword leaves for the city.

> **Zbigniew:** I'll tell the buyer the story. They always pay more for the story. You're not getting a share of that part.

### E3 — Carried (`carry`)
Condition: the player escorts one week of the north patrol (N: patrol task — a few in-game days walking the road with guards, any animal encounters fought for real). **Player receives:** the **Pinewatch Longsword** (proposed: longsword base stats, masterwork quality, higher durability; value 450–600) and keeps it. Nothing else.

> **Dobromir:** *(seeing it on the player's belt)* Good. That's where it goes.

The guard keeps the spearheads and shield in all endings. Dobromir keeps the badge in all endings.

## Refusal, interruption, missing NPCs

- If Dobromir dies before the player returns, the badge goes on his grave (the player can place it); Wisława decides alone (`carry` only if the player already did a patrol or Wisława's opinion ≥ 30).
- If Milena isn't available, the player can find the route alone (split pine spikes are visible); harder, no shared carrying.
- The locker has exactly one sword. No respawn.
- The bear's den persists; if driven out, she returns next winter.

## Mechanisms

**Required:** unique item identity; persistent den and prime animal; climb/cold; named payments; settlement armoury item transfer.
**Stub acceptable:** patrol week as a timed escort with 1–2 scripted encounters; locker as a container with a Strength gate.
**Out of scope:** avalanche simulation; inheritance law.
