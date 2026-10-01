# Quest 11 — The Bell in Blackwater

**Premise:** A dry season exposes a drowned chapel, its silver-clad bell, and a sealed toll chest. Recovering them could reopen a useful marsh crossing, enrich the player, or give a struggling ferrymaster a viable seasonal business.

**Status:** proposal; independent second Codex pass. It does not replace any existing quest.

## Intended emotional effect

Begin with curiosity and muddy inconvenience. End with the player understanding that a valuable object can be worth more as infrastructure, more as a sale, or more as a carefully limited partnership depending on who bears the work.

## Meta

| Field | Proposal |
|---|---|
| Typical start | After the player has reached a second settlement and has `helpfulness ≥ 5` in Domowice or `renown ≥ 3` in the nearest marsh settlement |
| Required locations | Blackwater crossing, old cemetery, drowned chapel, marsh track |
| Giver | Ewa, seasonal ferrymaster and boat-repairer |
| Other cast | Halvar, settlement steward; Anika, cemetery keeper; Olek, travelling buyer |
| Stages | 6 |
| Travel | Yes; proposed `roadActive` from Stage 2 until settlement choice |
| Main activities | Interview, inspect cemetery records, travel, rope work, recover items, manage a dangerous animal, transport heavy loot, negotiate ownership |
| Main rewards | Fixed relic loot, cash from a named purse or buyer, ferry income only if the route is actually restored |

The settlement name **Blackwater** is a proposal. It may become a fixed MD settlement or resolve to a generated marsh settlement with role tags.

## Characters

- **Ewa**, ferrymaster and boat-repairer. She wants the crossing reopened before the next wet season, but cannot abandon her boat or promise service through unsafe water. She speaks plainly, with practical measurements and little patience for romantic language.
- **Halvar**, steward. He is responsible for common funds. He wants a route that pays for its own upkeep, not a beautiful object in a storehouse. He speaks in quantities, dates, and obligations.
- **Anika**, cemetery keeper. She has copied old stones and knows which names are recorded fact and which are local guesses. She is quiet and precise; she corrects people who turn the dead into decoration.
- **Olek**, travelling buyer. He buys silverwork and old metal only when ownership is documented. He is courteous, cautious, and always asks who pays transport.
- **The black marsh boar**, a persistent unusually large boar whose wallow lies beside the chapel approach. It is territorial, not evil. It can be killed, lured away with food, or avoided until daylight if the player has enough time and supplies.

## World truth

Thirty-two years ago, a flood destroyed the old chapel causeway. The bell was silver-clad as a prosperous settlement’s warning bell; it is valuable but not solid silver. The sealed chest held toll records, copper coins, two silver trade bars, and a ferryman’s iron seal. The last ledger entry names the settlement, not Ewa’s family. The bell and chest therefore belong to the settlement unless a later witnessed agreement changes that ownership.

The present crossing is useful but not mandatory. Reopening it needs a safe landing, a repaired boat, a marked schedule, and a person responsible for maintenance. Recovering the objects alone does not reopen the route.

## State and flags

```text
q11.stage = 1..6
q11.accepted = false
q11.recordsSeen = false
q11.causewayFound = false
q11.chapelFound = false
q11.bellRecovered = false
q11.chestRecovered = false
q11.boarOutcome = unset|killed|driven_off|avoided
q11.choice = unset|restore|sell|partnership
q11.routePlan = unset|ferry|seasonal
q11.settled = false
```

`bellRecovered` and `chestRecovered` require physical item transfer, not merely reaching the marker. The chest is heavy loot and must obey weight and transport rules. `sell` is unavailable if ownership has not been documented. `partnership` requires Ewa’s consent and a named share schedule.

## Stage 1 — A road under the reeds

### 1.1 Ewa at the broken landing

**Ewa:** The road ends in water, and the water ends in a boat that leaks. People call that a crossing because “problem” is a longer word.

**Player:** You sent for me?

**Ewa:** I asked Halvar for hands. He sent me a reputation report with boots attached. If you are not here to measure, you may still leave before the mud takes your shoes.

**Player [A]:** Show me what is still useful.

**Ewa:** The old landing. The cemetery path. A chapel under the reeds, if the dry season has not lied about it. → `q11.accepted=true`, `q11.stage=1`

**Player [B]:** Is there a reward?

**Ewa:** There is work first. If the work creates value, we name who owns it before anyone carries it away.

**Player [C]:** I cannot take this on now.

**Ewa:** Then do not promise. I will ask again when the water changes. → quest remains inactive

### 1.2 Halvar sets the limit

**Halvar:** Ewa says the chapel may have a bell. Ewa says “may” quite loudly.

**Player:** What would Blackwater do with it?

**Halvar:** A bell can warn boats, mark market hours, or become an expensive ornament in a distant hall. The settlement can pay for recovery, but not for every story that begins with “perhaps.”

**Player:** How much is set aside?

**Halvar:** Enough for rope, food, and a fair recovery fee from `treasury_blackwater`. Nothing leaves the treasury until we know what was recovered. → `offerKnown=true`

**Player [A]:** I want the ownership written before I enter the marsh.

**Halvar:** Good. A wet chest is still a legal problem.

### 1.3 Anika at the cemetery gate

**Anika:** The chapel path begins among the graves. Do not move the stones because a line on a map looks untidy.

**Player:** What can the cemetery tell us?

**Anika:** Which families paid for the warning bell. Which ferrymen kept the crossing. And which parts of the story arrived after the flood.

**Player:** You have records?

**Anika:** Copies. The original book rotted. A copy is not the same as the book, but it is better than a confident memory.

**Player [A]:** I will read it before searching.

**Anika:** Then you may find the right thing for the right reason. → `q11.stage=2` when the player leaves with the record location

**Player [B]:** I will search the chapel first.

**Anika:** Then return when you are ready to distinguish a relic from a prize.

### 1.4 Ewa’s practical warning

**Ewa:** Take a rope, a lamp, and something to mark the ground. The marsh keeps a poor account of footsteps.

**Player:** What about the boar people mention?

**Ewa:** People mention every animal they did not want to meet twice. I saw one wallow by the old path. That is enough for me.

**Player [A]:** If it is there, I will not rush it.

**Ewa:** Sensible. A bell can wait. A boar is less patient.

## Stage 2 — Names among the dead

### 2.1 The cemetery copy

**Anika:** Here. “Bell purchased from the silverwright of North Ford, paid by the common purse.” The date is before the flood.

**Player:** Does it name a family?

**Anika:** No. It names a duty. The crossing belonged to the settlement because the settlement maintained it.

**Player:** And the chest?

**Anika:** The keeper’s note says the tolls were to be counted after the autumn market. No later entry survives.

**Player [A]:** I will report the ownership accurately.

**Anika:** Then Olek cannot buy what you have no right to sell. → `q11.recordsSeen=true`

**Player [B]:** I will call it abandoned.

**Anika:** Abandoned is a condition. It is not a person who signs a transfer.

### 2.2 Halvar hears the record

**Halvar:** The common purse paid for the bell. That makes recovery a settlement matter.

**Player:** Does it make the settlement responsible for the whole marsh?

**Halvar:** No. We can own an object and still refuse an unsafe route. Ownership is not a promise to be foolish.

**Player [A]:** Then I want two offers: recovery only, and recovery plus a route plan.

**Halvar:** I can make that distinction. The first is a fee. The second is a project.

**Player [B]:** What if I find a buyer willing to pay more?

**Halvar:** Bring the buyer after you bring a lawful claim. → `sellLead=true`

### 2.3 Olek at the market edge

**Olek:** Silver-clad bells are difficult cargo. The metal has value; the story has a price only if someone can prove it.

**Player:** Would you buy it?

**Olek:** From whom? That is the first question. How far must I carry it? The second. Can it be sold without angering three settlements? The third.

**Player [A]:** I have a cemetery copy identifying the common purse.

**Olek:** Then I can offer a real number after inspection, not before. → `buyerKnown=true`

**Player [B]:** I found no bell yet.

**Olek:** Then you have brought me a conversation.

### 2.4 Leaving the cemetery

**Anika:** The old road begins behind the yew. If the reeds cover the marker, look for the stone cut shaped like a boat.

**Player:** You will not come?

**Anika:** My knees are not an argument against history. They are an argument against wading. Bring back the seal if you find it.

**Player:** Why the seal?

**Anika:** Because a stamped record tells us which hand kept the count. That may settle what the chest was for. → `q11.causewayLead=true`, `q11.stage=3`

## Stage 3 — The old causeway

### 3.1 At the boat-shaped marker

**Ewa:** There. The stone points into water that is not there anymore.

**Player:** The causeway was here?

**Ewa:** Here, then around the black pool, then to the chapel. A straight line is what people draw after they forget the mud.

**Player [A]:** We follow the marked route and test every footing.

**Ewa:** Good. The route is not found because the player has arrived at a marker.

**Player [B]:** We cut through the reeds.

**Ewa:** You can. You will still owe your boots a replacement.

### 3.2 A dangerous crossing

**Player:** The ground gives way near the pool.

**Ewa:** I told you the water had not forgotten the road.

**Player [A]:** We lay boards and cross one load at a time.

**Ewa:** That costs timber, but it gives us a way back. → `temporaryFooting=true`

**Player [B]:** We turn back and return in daylight.

**Ewa:** That is not cowardice. It is a schedule. → `daylightPlan=true`

### 3.3 The boar’s wallow

**Player:** Fresh tracks. Deep ones.

**Ewa:** The wallow is beside the old chapel path. The animal owns this patch more convincingly than we do.

**Player [A]:** We mark its range and approach from the windward side.

**Ewa:** I like a plan that lets the boar remain alive and us remain unhurt.

**Player [B]:** We kill it before we continue.

**Ewa:** If you choose that, make it a hunting decision, not a fee disguised as courage. → `boarPlan=confront`

### 3.4 The chapel roof

**Player:** I can see stone under the reeds. The roof has fallen inward.

**Ewa:** Then the bell may be below the waterline. We need a rope line, not a hero.

**Player [A]:** We return for the longer rope and lamp.

**Ewa:** The marsh will still be here. Good. → `q11.stage=4`

**Player [B]:** I will climb in now.

**Ewa:** Not alone. If the floor takes you, the bell will not report where you fell.

## Stage 4 — The chapel under the reeds

### 4.1 The entry chamber

**Ewa:** The water is waist-deep here. The wall is sound on the left; the right side is mud.

**Player:** The rope stays on the sound wall.

**Ewa:** And one person carries while one person watches. We are recovering metal, not testing a legend.

**Player [A]:** I will inspect the floor before touching anything.

**Ewa:** That is why you still have both boots.

### 4.2 The bell chain

**Player:** The bell is here, half-buried. The chain is wrapped around a beam.

**Ewa:** Do not pull the beam toward you. Cut the chain if it will not release.

**Player [A]:** We free it without striking the bell.

**Ewa:** Good. A cracked bell is a lower price and a louder argument. → `q11.bellRecovered=true`

**Player [B]:** We cut the chain and drag it out.

**Ewa:** Then record the damage before anyone claims the full value.

### 4.3 The sealed chest

**Player:** There is an iron-banded chest behind the altar.

**Ewa:** The seal is still on it.

**Player:** We open it here?

**Ewa:** No. We bring it out closed. A sealed chest is evidence; an opened chest is a list of things people will remember differently.

**Player [A]:** We mark it, secure it, and carry it with witnesses.

**Ewa:** Then nobody has to trust a wet hand. → `q11.chestRecovered=true`

### 4.4 The iron seal

**Player:** The seal bears the old settlement mark.

**Ewa:** That settles the purpose, not the split. Tolls went into the common purse. The people who carried them still deserved wages.

**Player:** We return with the chest unopened.

**Ewa:** Yes. Let Halvar count it in daylight. → `q11.stage=5`

## Stage 5 — The animal and the load

### 5.1 Lure the boar away

**Player:** It is between us and the dry path.

**Ewa:** We can leave meat upwind and wait. The cost is time and one ration.

**Player [A]:** We wait.

**Ewa:** The boar takes the food. We take the path. Both choices can be practical. → `q11.boarOutcome=driven_off`

**Player [B]:** We go around through the reeds.

**Ewa:** The chest will be heavier by the time we return. → `q11.boarOutcome=avoided`

### 5.2 If the player fights

**Player:** It charges.

**Ewa:** Keep the chest behind you. Do not let the animal turn a recovery into a drowning.

**Player [A]:** I take the fight and finish it.

**Ewa:** Then we dress the carcass later. First we get the living and the metal home. → `q11.boarOutcome=killed`, `courage+1`

**Player [B]:** We retreat to the boards.

**Ewa:** The boar keeps the wallow. We keep the option to return. → `q11.boarOutcome=avoided`

### 5.3 The heavy chest

**Ewa:** The chest is heavier than the bell.

**Player:** The bell is awkward; the chest is dense.

**Ewa:** That is why a treasure story needs a cart or three people.

**Player [A]:** We make two trips and leave the chest under a guarded marker.

**Ewa:** Only if the marker is not a promise of safety. We return before dark. → `twoTripPlan=true`

### 5.4 Count in the dry shed

**Halvar:** Copper coins, two silver trade bars, toll tags, and the iron seal. The ledger is worth more than the copper if it lets us prove the route.

**Player:** And the bell?

**Halvar:** Sound, silver-clad, one dent. We can restore it. We cannot pretend restoration is free.

**Player [A]:** I want to discuss the route before discussing a buyer.

**Halvar:** Then you have understood the difference between recovery and resolution. → `q11.stage=6`

## Stage 6 — What should ring again?

### 6.1 Restore the crossing

**Player:** Return the bell and use the toll chest to repair the landing and boat.

**Halvar:** The chest pays for the first work. It does not pay every season.

**Ewa:** I can run a crossing from spring thaw to the first hard ice, if the settlement owns the boat and I receive a stated share.

**Player:** Then the route has an owner, a worker, and a maintenance reserve.

**Halvar:** That is a plan I can put before the council. → `q11.choice=restore`, `q11.routePlan=ferry`

### 6.2 Sell the relic

**Player:** Olek will buy the bell and bars. The settlement keeps the ledger and copper.

**Halvar:** A larger purse now, no crossing later.

**Ewa:** I cannot repair a boat with a story. If the landing stays closed, my seasonal work ends here.

**Olek:** I pay only after the bell is inspected and the settlement signs the transfer. No secret bargain, no invented premium. → `q11.choice=sell`

### 6.3 Seasonal partnership

**Player:** Keep the bell and enough of the chest to fund one season. Ewa runs the boat; the settlement and I share the measured tolls.

**Ewa:** I will do one season. I will not promise the next one before seeing the water.

**Halvar:** The agreement must state the repair reserve and the share. If the route loses money, the loss is named too.

**Player:** Then we reopen it as a trial, not a miracle. → `q11.choice=partnership`, `q11.routePlan=seasonal`

### 6.4 Final confirmation

**Halvar:** We have three plans. Restore, sell, or test a season. Which one are you asking us to record?

**Player:** The one shown in the ledger, with the named costs and owners.

**Halvar:** Good. I will not settle a sentence that changes after the coins move.

**Ewa:** Once the agreement is signed, I start repairs. Until then, the bell stays in the shed. → `q11.settled=true`

## Endings

### E1 — A crossing that works again

**Condition:** `choice=restore`, chest and bell recovered, settlement approves the repair budget, landing and boat are actually repaired, and Ewa accepts the work schedule.

**Halvar:** The first crossing was three people and a sack of grain.

**Ewa:** The boat held. That is enough for a first day.

**Player:** And the bell?

**Anika:** It rings at the landing, where the record says it belonged.

**Consequences:** The crossing becomes a real route with maintenance cost and a named ferrymaster. The player receives a recovery fee from `treasury_blackwater` plus a defined share of the recovered copper or first-season tolls, never both as duplicated value. The silver trade bars enter the settlement treasury or repair budget according to the signed ledger. The bell is not loot in the player’s inventory.

### E2 — The relic leaves the marsh

**Condition:** `choice=sell`, ownership record shown, Olek has enough real funds in `olek_purse`, and the bell passes inspection.

**Olek:** The bell will travel north. The trade bars travel with it. The copper stays with Blackwater.

**Halvar:** We can repair the cemetery path. We cannot repair the crossing from this sale.

**Ewa:** I will take the boat apart and sell the sound timber. That is not defeat. It is knowing when a job has ended.

**Consequences:** Player and settlement receive the agreed split from `olek_purse`; the old crossing remains closed and Ewa loses that seasonal occupation unless another route is funded. The ledger is archived locally. The player gains substantial cash, but no passive ferry income.

### E3 — One season, honestly measured

**Condition:** `choice=partnership`, signed share schedule, repaired boat and landing, and one real season or agreed trial period completed with tolls recorded.

**Ewa:** The route paid for rope, repairs, and my time. It did not become a road to riches.

**Halvar:** That is a useful result. We know what it costs now.

**Player:** Do we continue?

**Ewa:** Next season, if the water says yes and the agreement still does.

**Consequences:** The route remains a seasonal service. The player receives only the contracted share from recorded tolls; no future income is guaranteed. The bell stays with the settlement. If the trial loses money, the player and settlement can close it without a reputation penalty for honest accounting.

## Refusal, interruption, and omission

- Refusing Stage 1 leaves the crossing unchanged. Ewa may ask again after a season; no reputation penalty is applied.
- Leaving after the cemetery records keeps `recordsSeen` but does not claim the chapel was found.
- Entering the chapel without a rope or lamp can fail the recovery attempt; it must not silently grant the bell or chest.
- A KO or retreat leaves the landmark and animal state persistent. The chest remains unrecovered unless the game has a separate NPC recovery event.
- If the player kills or drives off the boar before the quest, `boarOutcome` records the factual outcome; no dialogue claims the player did something they did not do.
- Opening the chest alone blocks the clean “witnessed count” branch but does not magically destroy ownership. Halvar accepts a delayed count only if the player still has the seal and the item list can be verified.
- If Ewa becomes unavailable, Halvar can approve `sell` or a settlement recovery, but cannot promise her ferry work. If Anika dies after giving the record, the copied record remains; no NPC gains facts they never heard.

## Mechanisms

**Required:** persistent landmark state; physical rope/lamp/transport checks; conditional dialogue; fixed chest contents; named money sources; settlement construction/repair state; a persistent dangerous-animal state.

**Stub acceptable:** represent the crossing as a route flag and one repair cost; represent the seasonal trial as a counted number of successful crossings rather than a complete transport economy; use a simple witness list for the chest count.

**Out of scope for this quest:** fully simulated ferry traffic, procedural legal systems, underwater physics, and a complete council voting UI.

