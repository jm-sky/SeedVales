# Quest 12 — The Iron Under the Pine

**Premise:** A cemetery inscription and an old guard record point to a masterwork long sword sealed beneath a ruined watchtower. Recovering it could strengthen a dangerous road, produce a large sale, or give the player an exceptional weapon under a witnessed licence.

**Status:** proposal; independent second Codex pass. It does not replace `Q04 — The Handle Remembers` or any `grok-quest-*` file.

## Intended emotional effect

Start as a practical investigation and become a tense expedition. The reward should feel earned because the player learns what the weapon was made for, survives the route, and then has to decide whether “valuable” means money, public safety, or personal capability.

## Meta

| Field | Proposal |
|---|---|
| Typical start | `renown ≥ 4` in Domowice or relation `Nela ≥ 10`; `roadActive=false` |
| Required locations | Pinewatch cemetery, forest military road, ruined watchtower, mountain cave |
| Giver | Nela, junior guard captain |
| Other cast | Olek, quartermaster and record keeper; Vika, mountain guide; Soren, city arms buyer |
| Stages | 6 |
| Travel | Yes; proposed `roadActive` from Stage 2 until the weapon is assigned |
| Main activities | Read records, track an old road, inspect ruins, cave expedition, avoid or confront a prime bear, extract heavy loot, negotiate a licence |
| Main reward | `Pinewatch Longsword`, proposed `technology=traditional`, `workmanship=masterwork`, high durability; alternate cash or settlement equipment |

The weapon’s numeric damage, speed, weight, and value remain subject to the equipment catalogue. “Masterwork” is a design tag, not a promise of a particular DPS value.

## Characters

- **Nela**, junior guard captain. She wants a reliable weapon for the road patrol and is tired of inherited stories being used as excuses for unsafe work. She speaks in short operational sentences and notices missing equipment.
- **Olek**, quartermaster and records keeper. He cares about ownership, condition, and replacement cost. His speech is careful and contractual, but not cold.
- **Vika**, mountain guide. She knows the slope, snowline, and animal signs. She dislikes heroics and speaks through physical details: wind, footing, smell, and weight.
- **Soren**, city arms buyer. He offers the largest immediate cash payment but wants a documented transfer and will not pay for a weapon he cannot inspect.
- **The prime bear**, an unusually large bear denning in the collapsed watchtower cellar. It can be avoided, lured out, driven away, or killed. Its den state persists independently of the quest.

## World truth

The sword was commissioned for Captain Marek of Pinewatch and paid for by the road-guard company. Marek died during an avalanche rescue; the sword was sealed in the watchtower after the road was abandoned. The cemetery inscription and quartermaster’s record agree: the company, now represented by the nearest settlement guard, has the strongest claim. Marek’s descendants have no special ownership claim, but the name is preserved on the blade.

The sword is in a dry stone locker below the tower cellar. The prime bear uses the collapsed outer cellar as a den but cannot reach the locker without breaking through a narrow stone partition. The expedition does not require killing the bear. A second cache contains an old guard shield and three usable iron spearheads; these are settlement equipment, not additional legendary loot.

## State and flags

```text
q12.stage = 1..6
q12.accepted = false
q12.inscriptionRead = false
q12.recordConfirmed = false
q12.towerFound = false
q12.lockerFound = false
q12.swordRecovered = false
q12.bearOutcome = unset|killed|driven_off|avoided
q12.choice = unset|guard|sell|license
q12.transferWitnessed = false
q12.settled = false
```

The weapon cannot be awarded merely for entering the cave. `swordRecovered` requires the player to remove the physical item from the locker. `guard` requires an actual transfer and a named replacement or cash payment. `license` means the player keeps the sword while the settlement receives a documented fee and right of recall if the player abandons the road contract.

## Stage 1 — A name on cold stone

### 1.1 Nela outside the guardhouse

**Nela:** You have a reputation for going where a sensible person first asks how far it is.

**Player:** That sounds like criticism.

**Nela:** It is a description. I have a sword problem, not a personality problem.

**Player:** What happened?

**Nela:** The old Pinewatch road is open again. The tower is not. A cemetery stone says Captain Marek’s sword was sealed there. I need to know whether that sentence survived the years.

**Player [A]:** I will check the record before I promise the sword.

**Nela:** Good. I want evidence, not a weapon-shaped rumour. → `q12.accepted=true`

**Player [B]:** If it is valuable, I may sell it.

**Nela:** Then say so before I spend guard time helping you. There is no shame in wanting money. There is shame in hiding the price.

### 1.2 Olek’s register

**Olek:** Pinewatch. Captain Marek. One long sword, commissioned, paid from the road-guard account. That is the entry.

**Player:** Does the register name the person who may claim it?

**Olek:** It names the company. Companies change hands. Records are how they remember what they owe.

**Player:** What would the settlement receive if I return it?

**Olek:** A usable guard weapon and the old name. I can offer a recovery fee from `treasury_home`, but the amount depends on whether you return a sword or a story.

**Player [A]:** I want the record copied before we leave.

**Olek:** Sensible. Paper is lighter than an argument. → `recordKnown=true`

### 1.3 Vika at the road marker

**Vika:** The pine is still there. The road is not.

**Player:** Can you guide me?

**Vika:** To the lower shelf. After that, I guide the weather, the stones, and anyone who listens.

**Player:** What do you need?

**Vika:** Lamp, rope, food, and a way to carry the sword without waving it at every branch.

**Player [A]:** Then we prepare those things.

**Vika:** Preparation is the cheapest part of a mountain trip. → `guideAgreed=true`

### 1.4 Nela names the public need

**Nela:** The north road has no spare long weapon. If the sword returns to the guardhouse, it goes to the patrol with the longest route.

**Player:** You cannot assume I will give it back.

**Nela:** I am not assuming. I am telling you what it would change.

**Player [A]:** Then show me the fair alternatives before I decide.

**Nela:** Guard transfer, documented sale, or a licence for you to carry it while paying the road account. Three honest choices. → `q12.stage=2`

## Stage 2 — The record and the road

### 2.1 Cemetery inscription

**Olek:** “Marek’s iron returns to the watch when the road returns.” That is not a legal clause, but it is a clear intention.

**Player:** It says “the watch”, not “Nela”.

**Nela:** Correct. This is public equipment, not my inheritance.

**Player [A]:** I will report it exactly.

**Nela:** Then your later choice will at least be an informed one. → `q12.inscriptionRead=true`

### 2.2 A missing page

**Olek:** The register has a torn page after the commissioning entry.

**Player:** Does that weaken the claim?

**Olek:** It weakens certainty about later repairs. It does not erase the payment record.

**Player:** You do not know who carried it last?

**Olek:** No. I will not give you a name because the page is missing. → `q12.recordConfirmed=true`

### 2.3 The old road

**Vika:** Here is the roadbed. Two stones under the moss, then nothing. Keep left of the drop.

**Player:** The path looks easy.

**Vika:** That is a view, not a measurement. The slope is wet underneath.

**Player [A]:** We mark the safe shelf before carrying anything back.

**Vika:** Good. The return trip is when people discover the weight of success. → `routeMeasured=true`

### 2.4 Soren’s offer from afar

**Soren:** Nela says there may be a Pinewatch blade. If there is, I will pay well after inspection.

**Player:** You heard quickly.

**Soren:** City buyers hear about metal. We also hear when ownership is unclear, which is why I am speaking before you carry it to my counter.

**Player [A]:** Give me no price until you see the item.

**Soren:** Agreed. I can reserve a buying budget, not invent a value. → `buyerLead=true`

## Stage 3 — Pinewatch ruins

### 3.1 The collapsed tower

**Vika:** The tower fell inward. That is why the cellar may still have a roof.

**Player:** And the bear?

**Vika:** Smell on the wind. Old fur, wet stone, meat. It is using the outer chamber.

**Player [A]:** We wait for daylight and watch the entrance.

**Vika:** Better eyes, less surprise. The mountain will charge interest in time. → `daylightApproach=true`

### 3.2 The guard cache

**Player:** Three spearheads, a shield, and a broken lantern.

**Nela:** The spearheads can return to the guardhouse. The shield can be repaired if the wood is not rotten.

**Player [A]:** We take only what we can carry safely.

**Nela:** That sentence has saved more equipment than bravery ever did. → `cacheFound=true`

### 3.3 The bear’s den

**Vika:** The den begins there. The stone locker should be beyond the narrow gap.

**Player:** Can we reach it without entering the den?

**Vika:** From the upper shelf, perhaps. We need a rope line and no shouting.

**Player [A]:** We try the upper shelf first.

**Vika:** Good. Let the bear keep its room while we take the room behind it. → `bearPlan=avoid`

**Player [B]:** We drive it out.

**Vika:** Fire and noise may work. They may also turn a den into a road. → `bearPlan=drive`

### 3.4 The locker mark

**Player:** A pine cut into the stone. Three short strokes below it.

**Olek:** The guard company’s old mark. That is stronger than a tavern tale.

**Player:** The locker is sealed, not trapped.

**Olek:** Then open it with witnesses. A good item does not need a bad story around it. → `q12.towerFound=true`, `q12.lockerFound=true`, `q12.stage=4`

## Stage 4 — The iron under the pine

### 4.1 The extraction plan

**Vika:** The stone slab lifts toward the slope. If it slips, it crushes the person below.

**Player:** Rope on the upper anchor, two people lifting, one watching the edge.

**Vika:** That is a plan. The sword has waited; we do not need to hurry it now.

### 4.2 The blade

**Player:** The scabbard is dark leather, the fittings plain. The blade has not rusted.

**Nela:** Do not draw it in the dust.

**Player:** You expected ornament.

**Nela:** I expected a guard’s sword. The best tool in a patrol is the one that survives work.

**Player [A]:** I lift it with the cloth and keep the scabbard intact.

**Nela:** Good. → `q12.swordRecovered=true`

### 4.3 Marek’s name

**Olek:** “Marek” is stamped under the guard. Not a title. A person.

**Player:** Does that change ownership?

**Olek:** No. It changes what the settlement should remember when it assigns the weapon.

**Nela:** And it tells the next guard that a name is not a stat bonus. It is a responsibility.

### 4.4 The return load

**Vika:** Sword in the case, spearheads wrapped, shield tied flat. We leave the broken lantern.

**Player:** There is room for it.

**Vika:** There is always room for one more bad decision. → `q12.stage=5`

## Stage 5 — The bear and the road back

### 5.1 Avoidance succeeds

**Vika:** The bear left before dawn. Tracks go east.

**Player:** We can pass without touching the den.

**Vika:** Then we do. A safe recovery is still a recovery. → `q12.bearOutcome=avoided`

### 5.2 Driving it away

**Player:** The fire is at the outer entrance. The bear is moving toward the ravine.

**Vika:** Keep the path open. Do not trap it between us and the drop.

**Player:** It is gone.

**Vika:** For now. Record the den as active; someone else may meet it later. → `q12.bearOutcome=driven_off`

### 5.3 If the player kills it

**Player:** The bear is down.

**Nela:** Is anyone hurt?

**Player:** No.

**Nela:** Then we take the hide only if we have time and carrying capacity. The sword remains the reason for the expedition. → `q12.bearOutcome=killed`, `courage+1`

### 5.4 Nela sees the weapon

**Nela:** It is balanced forward. A road weapon, not a parade blade.

**Player:** You still want it for the guard.

**Nela:** I want the guard to have a choice. The record gives the company the strongest claim; the person who recovered it still deserves a fair offer. → `q12.stage=6`

## Stage 6 — Three honest owners

### 6.1 Give it to the guard

**Player:** Transfer the sword to the guardhouse. I want the recovery fee and the old shield repaired for the patrol.

**Nela:** That is two requests. The first comes from `treasury_home`; the second comes from the guard repair budget.

**Olek:** We can record both separately. No hidden value in a polite sentence.

**Player:** Then record them separately.
→ `q12.choice=guard`

### 6.2 Sell it to Soren

**Player:** Let Soren inspect it and buy it. The settlement receives its lawful share; I receive the expedition payment and the remainder of the sale.

**Soren:** I will pay only for the sword’s condition and documented transfer. I will not pay twice because three people admired it.

**Nela:** The road loses an exceptional weapon. The guard gains cash for several ordinary replacements.

**Player:** That is a real trade, not a hidden failure. → `q12.choice=sell`

### 6.3 Keep it under licence

**Player:** I keep the sword for a year of road service, pay the guard account a fixed licence fee, and return it if I abandon the contract.

**Nela:** I need a clear return condition and proof that you actually carry it.

**Olek:** The licence is not a gift. It is not ownership without duties.

**Player:** Then make it a witnessed equipment contract. → `q12.choice=license`

### 6.4 Confirmation

**Nela:** The sword is clean, the record is copied, and the choices are written. Choose now, or leave the item in the guardhouse while you decide.

**Player:** I choose the recorded plan, with no reward that is not paid by a named source.

**Olek:** Good. The account will match the story. → `q12.settled=true`

## Endings

### E1 — Iron on the road

**Condition:** `choice=guard`, witnessed transfer, payment from `treasury_home`, and the repaired shield or an equivalent defined guard repair is actually completed.

**Nela:** The sword goes to the north patrol. The shield goes to the evening watch.

**Player:** And Marek?

**Nela:** His name goes in the equipment register. The next guard can read it before taking the road.

**Consequences:** The guard receives `Pinewatch Longsword`; the road patrol’s equipment quality improves. Player receives a fixed recovery fee from `treasury_home` and a separate relation/reputation increase. The player does not also receive the sword or its sale value.

### E2 — A very good sale

**Condition:** `choice=sell`, Soren inspects the sword, all ownership records are shown, and `soren_purse` contains the agreed purchase price.

**Soren:** The blade is worth the price. The story is worth the paperwork, not more.

**Nela:** The guard account can buy two reliable swords and repair the gate hinge.

**Player:** The road gets ordinary iron instead of one exceptional blade.

**Nela:** Ordinary iron in two hands can protect more people than one perfect sword in a cabinet.

**Consequences:** The player receives a substantial sale share and recovery fee only if the contract states both; the settlement receives its documented share from the sale. Soren owns the unique sword. The guard’s equipment improves through cheaper replacements, but no named masterwork remains locally.

### E3 — The licensed blade

**Condition:** `choice=license`, the player pays the licence from `player`, carries the sword during the defined road-service period, and the contract remains in good standing.

**Nela:** The sword is yours to use for the term. The road is not yours to abandon without returning it.

**Player:** And after the term?

**Olek:** Renew, return, or negotiate a purchase. The item will not become yours because time passed unnoticed.

**Vika:** It will become heavy in a different way. People will expect you to know what it is for.

**Consequences:** Player receives the weapon for the contract term and a small recovery fee; the guard receives a licence payment and can recall the item if the player breaks the road-service condition. No passive money is created. The player’s combat capability changes, while the settlement retains a future claim.

## Refusal, interruption, and omission

- Refusing Nela leaves the weapon sealed and the guard road unchanged.
- Finding the tower without reading the records permits inspection but blocks the clean transfer and sale endings until ownership is reconstructed.
- A cave retreat preserves the locker and bear state. The game must not respawn a second sword.
- KO, injury, or insufficient carrying capacity can delay extraction. The guard may later mount a recovery expedition, but the player receives no reward for work not performed.
- If Nela becomes unavailable after the record is copied, Olek can administer a sale or temporary storage but cannot invent Nela’s operational preferences.
- Killing the bear is never a hidden requirement. If the player avoids it, later dialogue must say “avoided” or “driven away”, not “cleared the den”.

## Mechanisms

**Required:** persistent unique item identity; ownership and witnessed transfer; conditional dialogue; persistent animal den; equipment comparison; a normal trade/payment path.

**Stub acceptable:** represent the licence as a timed quest flag and a simple recall condition; represent the guard benefit as one equipment-quality modifier; use a fixed cave encounter rather than full structural simulation.

**Out of scope for this quest:** procedural inheritance law, a full armoury management UI, and realistic metallurgy simulation beyond the item’s normal quality/material fields.
