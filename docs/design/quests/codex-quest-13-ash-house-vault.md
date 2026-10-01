# Quest 13 — The Ash House Vault

**Premise:** A ruined manor and its family cemetery hide a documented household reserve: coins, jewels, heirloom armour, and a deed. The living claimant needs money now, but restoring the property could also give a settlement a safe house and a valuable landmark.

**Status:** proposal; independent second Codex pass. It does not replace `Q05 — The Map That Missed the River`, `Q09 — Goods on the Ground`, or any `grok-quest-*` file.

## Intended emotional effect

The first half should feel like exploration of a place that is slowly becoming legible: road marker, cemetery, house, cellar. The second half should make the player uncomfortable in a productive way: every ending is lawful and useful to someone, but no ending preserves everything.

## Meta

| Field | Proposal |
|---|---|
| Typical start | `helpfulness ≥ 7` in Domowice or `renown ≥ 5`; no active road quest |
| Required locations | Ash House ruins, family cemetery, wooded approach, collapsed cellar |
| Giver | Irena, descendant and seamstress in the nearest town |
| Other cast | Tomas, settlement builder; Anika, cemetery keeper; Soren, property buyer |
| Stages | 6 |
| Travel | Yes; proposed `roadActive` from Stage 2 until the claim is settled |
| Main activities | Verify records, escort claimant or carry documents, inspect ruin, clear hazards, recover multi-category loot, negotiate a deed and division |
| Main reward | Fixed coins, two gems, heirloom cuirass, deed, or a share of a documented sale |

The “Ash House” is a proposed landmark. It is not a magic ruin and does not require a treasure map. The lead comes from a road marker and cemetery record.

## Characters

- **Irena**, descendant of the Ash House line, now a seamstress. She wants enough money to clear her household debt and enough dignity not to have her family reduced to a chest of coins. She speaks warmly but becomes exact when discussing debts and ownership.
- **Tomas**, settlement builder. He sees the ruin as a possible winter storehouse, shelter, or workshop. He dislikes sentimental restoration projects without maintenance plans.
- **Anika**, cemetery keeper. She verifies names, dates, and the distinction between a family’s claim to land and a person’s claim to every object found there.
- **Soren**, property buyer. He can buy the deed and recovered non-heirloom valuables as a package. He wants a clean title and accepts that a ruined house may cost more to restore than it is worth.
- **The old moose**, a large territorial animal using the orchard edge. It is not required to die. The player may wait, reroute, or create distance; a dangerous encounter is possible if the player approaches during its feeding period.

## World truth

The Ash family owned the manor and maintained a small emergency reserve for winter wages. The last owner, Marta Ash, left a witnessed deed naming her eldest daughter’s line as successor. Irena is the surviving reachable descendant of that line. The deed does not grant her automatic ownership of every loose object found in the ruins, but it is strong evidence for the property and household reserve.

The cellar contains 180 copper coins, two cut rubies, a high-quality reinforced leather cuirass, a sealed packet of household wages, and a deed in a metal tube. The packet names three unpaid workers from the final winter. Their descendants may not be identifiable in the current settlement. The house can be made into a storehouse only after structural work and a maintenance owner are agreed.

## State and flags

```text
q13.stage = 1..6
q13.accepted = false
q13.cemeteryVerified = false
q13.claimantPresent = false
q13.houseReached = false
q13.cellarSafe = false
q13.vaultOpened = false
q13.deedRecovered = false
q13.choice = unset|restore|divide|sell
q13.mooseOutcome = unset|avoided|rerouted|encountered
q13.settled = false
```

The vault loot is fixed, not random quest money. The worker packet may be treated as a claim ledger rather than a generated payout. The `restore` ending requires the deed, structural inspection, and a named maintenance owner. `sell` requires Soren’s actual funds and a signed property transfer.

## Stage 1 — The road marker

### 1.1 Irena at the sewing bench

**Irena:** My family house is a ruin now. That is the short version. The longer version has a cemetery, a deed, and a cellar no one has opened in twenty years.

**Player:** Why ask me?

**Irena:** Because Tomas will inspect the walls and Soren will inspect the price. I need someone to inspect the truth between them.

**Player [A]:** I will help verify the claim before touching the house.

**Irena:** Thank you. I can ask for help without pretending the answer is already mine. → `q13.accepted=true`

**Player [B]:** If there is a vault, I expect a share.

**Irena:** Good. Say that before the mud and the story make you generous with other people’s property.

### 1.2 Tomas explains the useful ruin

**Tomas:** A ruined house can still be useful. Dry stone, a cellar, a road position. It can also collapse on the person describing its potential.

**Player:** Would the settlement want it?

**Tomas:** If the roof line can be made safe and someone owns the maintenance. “The settlement” is not a person who carries a beam.

**Player [A]:** Then we inspect before we promise restoration.

**Tomas:** That is the only kind of promise I will hear. → `restorationLead=true`

### 1.3 Anika’s boundary

**Anika:** The Ash graves are on the hill beyond the birch. I can verify the line, but I cannot turn a graveyard into a courtroom.

**Player:** What do you need from Irena?

**Anika:** Her name, her mother’s name, and the witness who copied the family record. The dead are not hiding the answer; the living are simply impatient.

**Player [A]:** We go together.

**Anika:** Better. A claimant should hear the record, not receive it as a rumour. → `q13.stage=2`

### 1.4 Irena states the pressure

**Irena:** The debt is not dramatic. That is why it is dangerous. It takes a little every week and leaves the household with no winter margin.

**Player:** Would you sell the house if you could?

**Irena:** I would sell stone before I sell a name. But if the house cannot stand, keeping the deed may be an expensive kind of pride.

**Player:** Then we will keep the choices open.

**Irena:** Open choices are useful only if they close honestly.

## Stage 2 — The family cemetery

### 2.1 The line of succession

**Anika:** Marta Ash, last owner. Her daughter Elin. Elin’s daughter Ren. Ren’s daughter Irena.

**Irena:** My mother never saw the house.

**Anika:** A claim can travel through a family without a person travelling to the place.

**Player:** Is the record enough?

**Anika:** Enough to investigate. A deed still has to be found and read. → `q13.cemeteryVerified=true`, `q13.claimantPresent=true`

### 2.2 The unpaid winter packet

**Anika:** The cemetery book mentions three winter workers. Their names are written beside “to be paid from the house reserve.”

**Irena:** I did not know that.

**Player:** Does it mean the reserve belongs to them now?

**Anika:** It means the reserve was not meant to be forgotten. It does not tell us whether their descendants can be found.

**Irena:** Then we look for them before calling the whole chest mine.

### 2.3 A practical offer

**Tomas:** If the deed confirms the land, I can estimate a safe storehouse conversion.

**Player:** Would the settlement pay for it?

**Tomas:** Only if Irena grants use, or the settlement buys the property. I will not turn a family house into common storage by enthusiasm.

**Player [A]:** Put the estimate beside the sale value.

**Tomas:** That gives everyone the same hard numbers. Good. → `restorationEstimate=true`

### 2.4 Soren’s warning

**Soren:** A ruin with a clean deed is valuable. A ruin with a clean deed and no roof is a different number.

**Player:** You would buy it?

**Soren:** If I can inspect the title, access, and repair cost. I pay from `soren_purse`, not from a village dream.

**Irena:** If I sell, I want the worker packet and heirlooms separated first.

**Soren:** That is reasonable. A property sale is not permission to swallow history. → `buyerLead=true`, `q13.stage=3`

## Stage 3 — The ash road

### 3.1 The overgrown approach

**Tomas:** The road is still raised above the wet ground. Someone built it properly.

**Player:** The house must have mattered.

**Tomas:** Or the builder wanted dry feet. Do not confuse good drainage with grandeur.

**Irena:** My grandmother called it the ash road because of the trees, not the house.

### 3.2 The moose at the orchard

**Player:** There is a large moose feeding among the fallen apples.

**Tomas:** Then the direct path belongs to it for now.

**Player [A]:** We wait until it moves.

**Tomas:** Costs time, saves a fight.
→ `q13.mooseOutcome=avoided`

**Player [B]:** We take the old garden wall around.

**Tomas:** Costs distance, gives the animal room. → `q13.mooseOutcome=rerouted`

**Player [C]:** We approach with weapons ready.

**Tomas:** Ready is not the same as wise. → `q13.mooseOutcome=encountered`

### 3.3 The gate and the mark

**Irena:** The gatepost has the Ash mark. I remember it from my mother’s sewing box.

**Player:** The hinge is broken, but the wall stands.

**Tomas:** The wall stands because it has not been asked to do much lately. I will inspect the load-bearing side before anyone enters.

### 3.4 Arrival at the house

**Tomas:** The front room is unsafe. The kitchen wall is sound enough for one person at a time. The cellar stairs are blocked.

**Player [A]:** We clear only the marked safe route.

**Tomas:** Good. A ruin does not become safer because we remove everything that looks untidy. → `q13.houseReached=true`, `q13.stage=4`

## Stage 4 — The house remembers its weight

### 4.1 Inspect the cellar

**Tomas:** The collapse is above the stairs, not below. We can shore it for a short entry.

**Player:** What materials?

**Tomas:** Two straight beams, wedges, and a person who stops work when the stone moves.

**Player [A]:** We bring the measured materials.

**Tomas:** Then the first cost is known. That is already better than most restorations. → `q13.cellarSafe=true`

### 4.2 The hidden metal tube

**Irena:** There is a mark behind the pantry shelf.

**Player:** A tube socket. The tube is not here.

**Irena:** My mother said the house kept its papers where fire could not reach them.

**Tomas:** A metal tube in a stone wall is a better hiding place than a drawer, but not better than a person who remembers it.

### 4.3 The vault door

**Player:** The cellar has a small iron door with three ash leaves.

**Irena:** The family mark.

**Player:** It is locked, not trapped.

**Tomas:** We inspect the frame before forcing it. If the ceiling shifts, the coins will not help us.

**Player [A]:** We open it only after the support is checked.

**Tomas:** Correct. → `q13.vaultReady=true`

### 4.4 The worker packet

**Player:** The first packet is marked “winter hands”.

**Irena:** Then it is not simply mine.

**Player:** It may be impossible to find every descendant.

**Irena:** Impossible is not the same as inconvenient. We make a public notice before we divide it.

**Tomas:** That will delay the money.

**Irena:** It may also stop the money becoming a second debt. → `workerPacketKnown=true`, `q13.stage=5`

## Stage 5 — The vault

### 5.1 Opened in daylight

**Anika:** Read the deed where everyone can see it.

**Irena:** “The house and land pass to Elin’s line, provided the reserve is used for wages and repairs before private luxuries.”

**Player:** That is an instruction, not a modern law.

**Anika:** It is still evidence of intent. We should not erase it because it complicates the reward.

### 5.2 The contents

**Player:** One hundred and eighty copper coins, two rubies, a reinforced leather cuirass, and the deed tube.

**Irena:** The cuirass belonged to Marta’s brother. I recognise the stitching.

**Tomas:** The coins can buy beams. The jewels can buy a roof. The armour can protect a person or become another sale.

**Player [A]:** We list each item before assigning it.

**Anika:** Exactly. A pile is not a settlement. → `q13.vaultOpened=true`, `q13.deedRecovered=true`

### 5.3 The deed and the ruin

**Soren:** The deed is legible. I can make an offer for the property, but not for the worker packet as if it were mine.

**Player:** Would you accept the house without the cuirass?

**Soren:** Yes. A buyer wants walls and title. An heirloom is a separate conversation.

### 5.4 Irena’s hard question

**Irena:** If we restore the house, my debt remains until the storehouse earns enough. If we sell, the debt ends quickly and the house becomes someone else’s problem.

**Player:** What do you want?

**Irena:** I want not to choose while everyone calls one answer noble and the other shameful.

**Player:** Then we name the cost of each.

**Irena:** Good. That is the first fair thing this ruin has offered. → `q13.stage=6`

## Stage 6 — A house, a division, or a sale

### 6.1 Restore as a public storehouse

**Player:** Irena keeps the deed. The settlement funds the safe conversion and leases the dry rooms for storage.

**Tomas:** Lease, maintenance, and a review date. Otherwise the house becomes common property by accident.

**Irena:** The lease clears part of my debt and keeps the name on the door.

**Player:** The winter packet remains reserved until notices are answered.

**Tomas:** Then we have a storehouse, not a sentimental monument. → `q13.choice=restore`

### 6.2 Witnessed division

**Player:** We pay the documented worker claims first if a claimant appears, repay materials, let Irena take the heirloom cuirass, and divide the remaining coins and rubies by the signed settlement.

**Irena:** I accept, provided the cuirass is valued openly if I later sell it.

**Anika:** And the deed remains with you until the property is separately transferred.

**Player:** Nothing moves because someone speaks confidently. → `q13.choice=divide`

### 6.3 Sell the property and reserve

**Player:** Soren buys the house and land. Irena receives the agreed price after the worker notice period; the heirloom and any identified wages are excluded from the sale.

**Soren:** I will repair the road only if the purchase contract includes access. I will not promise a public storehouse.

**Irena:** It will end the debt. The house will leave the family.

**Player:** That is a real cost, recorded before the money. → `q13.choice=sell`

### 6.4 Final confirmation

**Irena:** Restore, divide, or sell. I can live with any of them more easily if the terms are visible.

**Anika:** Then sign only what you have read.

**Player:** I confirm the named plan and the items it does not include.

**Tomas:** That is how a ruin becomes either a building or a closed chapter. → `q13.settled=true`

## Endings

### E1 — The Ash House opens again

**Condition:** `choice=restore`, deed recovered, cellar and access made safe, settlement lease approved, and Tomas confirms the first structural work is complete.

**Irena:** The sign is small.

**Tomas:** Small signs are easier to maintain.

**Player:** What happens to the coins?

**Irena:** Beams first. The reserve is for repairs and wages, just as the deed says.

**Consequences:** Ash House becomes a usable, limited storehouse or shelter landmark. `treasury_home` pays the agreed conversion cost and receives a lease/maintenance obligation; Irena receives a real lease payment from the named source. Player receives a fixed recovery fee and may receive a modest share for arranging the contract. The heirloom cuirass remains with Irena unless separately traded.

### E2 — A witnessed division

**Condition:** `choice=divide`, item list witnessed, worker notice period completed or claimant handling explicitly stubbed, materials repaid, and all transfers recorded.

**Irena:** The coins are less impressive after the beams are paid.

**Player:** They are also more honest.

**Anika:** The rubies are divided by the written agreement. The cuirass stays with the family.

**Irena:** If I sell it later, I will know what it was worth before I needed the money.

**Consequences:** Irena receives the lawful family share and heirloom; worker claims are paid when verified; the player receives a named recovery/mediation fee from `irena_purse` or the agreed sale of an item, not both without a contract. The house remains a ruin, but the road marker and cemetery record are preserved.

### E3 — A clean sale

**Condition:** `choice=sell`, title verified, Soren has funds in `soren_purse`, worker packet is excluded or handled, and the sale contract is signed.

**Soren:** The house is mine. The road access is written. The worker reserve is not.

**Irena:** I can pay the debt tomorrow.

**Player:** And the name?

**Irena:** Names travel better than walls. I will keep it.

**Consequences:** Irena receives a large real payment from `soren_purse` and clears the named debt; the player receives the agreed finder/mediation fee; Soren owns the property and may restore it privately. No public storehouse is created. The heirloom cuirass and verified wages remain outside the sale unless explicitly transferred.

## Refusal, interruption, and omission

- Refusing Irena leaves the property dormant. No treasure appears in the player’s inventory.
- Visiting the ruin without Irena or the verified cemetery record allows environmental discovery but blocks a clean ownership settlement.
- If the player enters the unsafe cellar, the game may cause injury or force retreat; it must not award the vault through an abstract “search complete” flag.
- The moose encounter is not a required kill. If the player waits or reroutes, the outcome is recorded accurately; the animal remains in the world.
- If the player takes the coins before the witnessed list, the divide and restore branches require a reconciliation conversation. The quest should not silently normalise theft.
- If Irena becomes unavailable after the deed is recovered, Tomas may secure the house, but he cannot sell or divide her property without an explicit legal mechanism.
- If a worker descendant appears later, the worker packet remains a claimable reserve. A completed sale cannot consume that reserve unless the contract explicitly names the liability.

## Mechanisms

**Required:** persistent landmark and structural state; claimant/ownership state; fixed multi-category loot; conditional dialogue; normal trade and named money sources; optional animal encounter.

**Stub acceptable:** represent the worker-notice period as a timed flag; represent the lease as a settlement building modifier; use a simple “safe route” construction state for the cellar.

**Out of scope for this quest:** full genealogy search, procedural property law, dynamic real-estate markets, and a complete public-notice UI.
