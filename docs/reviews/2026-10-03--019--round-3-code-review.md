# Code review, round 3: wave 5c/5d combat, items, economy, loot and mayor (review--001, code part)

- **Range:** `8e8a610..92313bb` (main). It covers:
  - LOOT-01 treasure (`sim/treasure.ts`, `data/loot.ts`) and the voices volume channel;
  - the SET-05 mayor slice (`sim/mayor.ts`);
  - combat--001 target lock (`sim/combatTarget.ts`, `Game.ts`);
  - combat--002 block and parry (`sim/guard.ts`);
  - combat--004 jump (`sim/motion.ts`, `player.ts`, `collision.ts`);
  - combat--003 dodge (`sim/dodge.ts`);
  - items--001 / economy--004 stack identity (`canMerge`, `removeItem`);
  - combat--005 edge (`sim/edge.ts`);
  - economy--003 inn meals (`sim/inns.ts`, `data/innMeals.ts`, `newGame.ts`);
  - render--010 carrion (`render/carrionFx.ts`, `dynamics.ts`).

  audio--001 and the NPC labels/quest icons (`9db1852`) landed **before** `8e8a610`. Only the parts the range touches were re-checked: the voices bus, the new activity sounds, and `npcOverlays` for fog and spatial queries.
- **Reviewer:** an independent Opus subagent in an isolated worktree. No `src/` changes were made.
- **Evidence:**
  - Full vitest run with a temporary config (not committed): **79 files, 480/480 passed**.
  - `pnpm type-check` is clean.
  - `node scripts/check-layers.mjs` reports: "sim, world, data, config, core, save are free of three/vue/render/ui/audio imports; UI does not mutate sim state".
  - Throwaway probes (`src/game/sim/zzReview019.test.ts`, not committed) produced the numbers quoted below.
  - No e2e run.
- **Legend:** ✅ confirmed (reproduced, or read in code with the failure path traced) · 🟡 assumption · ❓ open.

## Summary

The core rules are well built and well tested:
- **Transient state:** lock, guard, dodge and motion state are transient (Game field and WeakMaps per `Sim`). A load builds a new `Game` and a new `Sim`, so nothing stale survives a load.
- **Conservation:**
  - Treasure coins go through `logMint`; belly and treasure items go through `giveOrDrop` with a source.
  - Inn meals consume through `consumeItem(…, 'inn_meal')` and pay the treasury through `payToTreasury`.
  - The tax multiplier only scales an NPC→treasury transfer.
  - Lodging now pays the treasury.
- **Per-frame work** uses spatial queries:
  - `npcOverlays` uses `actors.query` + `isExplored`;
  - `combatCandidates` and soft assist use `actors.query`, and only on Tab or on a swing;
  - the lock uses `sim.actor(id)`, which is a map lookup;
  - carrion uses `corpsesNear`.

Four mechanics break their own decisions:
1. **Jump-climbing:** repeated jumps climb any wall up to about 2.4 m high, however steep. D-MOVE-1 (5) says a jump never gains more than a lip.
2. **Shield with two-handed weapons:** the inventory "use" path lets a shield stay in the off hand next to a two-handed weapon or a bow. D-COMBAT-2 says they are mutually exclusive.
3. **Parry re-arm:** a held RMB re-arms the parry window after a dodge, a panel, an activity or a KO, without a new press. The plan says only a real release → press opens the window.
4. **Fermented cabbage is invisible to NPCs:** `findFood` never selects fresh fermented cabbage. The "emergency reserves" of D-INN-1 are partly inert.

## Findings

| # | Area | Severity | | Location | Failure scenario | Reproduction |
|---|---|---|---|---|---|---|
| 1 | Jump / lip rule (D-MOVE-1 #5, #6) | major | ✅ | `sim/collision.ts:79,141-146`; `sim/motion.ts:59-61`; `sim/player.ts:244-250` | **Jump spam climbs walls far above a lip, however steep they are.** Three rules combine. (a) `lipCleared` asks only that the airborne feet be within 5 cm of the destination terrain and that the terrain 2 m beyond average ≤ 1.2. (b) `stableSupport` uses `Terrain.slopeAt`, a ±1 m central difference, so any wall shorter than about 2 m horizontally reads as "stable". (c) Because of (b), landing accepts the mid-wall point as support (`landPlayer` at the current x/z). The player therefore stands partway up the face, and the next jump starts from there and gains up to another apex. Repeat until the crest. The decision says "a 0.66 m jump can never gain more than a lip". The existing test (`motion.test.ts:113`) allows apex + 1.5 m (2.16 m) and only probes a sustained face, so it cannot catch this. Player terrain edits (`raise`/`level`/`dig`) can build such walls. | Probe: synthetic terrain (flat, then a straight wall), push +z for 30 s, jump every 0.2 s. **2.4 m wall over 0.8 m (gradient 3): climbed, +2.40 m, 42 m past the foot.** **1.5 m over 0.3 m (gradient 5): climbed.** 4 m over 1.2 m: not climbed. Without jumps none are climbed. Fix direction: judge landing stability at step scale (the rise from the take-off support, or a short-kernel gradient), not with the 2 m `slopeAt`. Cap the net height a jump may gain over its take-off support. Tighten the test to "≤ apex" on a short wall near a crest. |
| 2 | Shield exclusivity (D-COMBAT-2) | major | ✅ | `Game.ts:616-620` (weapon branch of `useItem`) | **Two-handed weapon or bow plus shield.** The shield branch refuses while a two-handed weapon is in hand. The weapon branch (inventory "Use", `InventoryPanel.vue:97`) sets `p.eq.main` directly and never clears `eq.off`. Only `equipToMain` (switch weapon, auto-wield) does that. `defenceOf` checks the shield first. Result: a longsword (24 dmg, 2H) with a 140° / 80 % shield block, or a **bow drawn while holding a shield guard**, since guard and draw are independent. Pre-existing for a torch, now much more consequential. | Probe: `Game.prototype.useItem` on `wooden_shield`, then `long_sword` → `main long_sword, off wooden_shield, defence shield`. Then `short_bow` → `main short_bow, off wooden_shield, defence shield`. Fix: route the weapon branch through `equipToMain`, or apply the same two-handed rule. Add a unit test. |
| 3 | Parry window (combat--002 plan §"Parry resolution", D-COMBAT-3 #5) | minor | ✅ | `sim/player.ts:97`; `sim/guard.ts:94-98`; `Game.ts:242` | **A held RMB re-arms the parry window without a press.** `setGuard` receives `inp.guard && combat && !ko && !activity && !dodging`, and `Game` adds `&& !this.panel`. Any of these gates turning false and back to true is treated as a fresh press, so `startedAt = now`. Holding RMB through a dodge therefore yields a free parry window as the dodge ends: 0.25 s with a shield, at 0.6× stamina cost and with a 0.9 s attacker stagger. The same happens after closing a panel, finishing an activity or standing up from a KO. The plan says "only a real released → pressed transition starts a new window". | Probe: hold guard 1 s → `block`. `requestDodge(0,-1)`, step 0.28 s with RMB still held → `held true, 0.08 s since start`. The next hit resolves as **`parry`**. Fix: track the raw input edge separately from the effective guard; open the window only on a raw press. |
| 4 | NPC food selection vs. preserved food (D-INN-1) | major | ✅ | `sim/inventory.ts:249-262` (`findFood`, `bestScore = -1`) | **Fresh fermented cabbage is never chosen by anyone who uses `findFood`.** Score = nutrition − fresh/100. A new `fermented_cabbage` scores 14 − 21.6 = −7.6, below the −1 start, so `findFood` returns undefined even when it is the only food. In a house (factor 0.5) it becomes visible only after about 55 days. Consequences: (a) the herbalist reserve (`fermented_cabbage ×2` only) and the cabbage part of the farmer and trader reserves are unusable by hungry NPCs, companions (`companions.ts:155`) and caravans. (b) `caravanFoodAvailable`/`mealValue` count it as nutrition, but `takeFood` cannot pack it, so a trader may depart believing it has provisions. (c) Player-made fermented cabbage given to NPCs is inert. Salted meat (22 − 18 = 4) is just above the cut-off. | Probe: `findFood({items:[newStack('fermented_cabbage',3)]})` → **undefined**. `salted_meat` → found. Fix: start `bestScore` at `-Infinity`, and score freshness relative to `spoilH` instead of absolute hours. Add a test that every edible food is selectable when alone. |
| 5 | KO while airborne (D-MOVE-1 #3, #9) | minor | ✅ | `sim/player.ts:100-111` | **A knock-out mid-jump freezes the player in the air.** The KO branch returns before the vertical controller, and only the deep-water case calls `repairPlacement`. The body lies about 0.4 m above the ground for `koStandUpS`. When the KO ends, the stale `vy` resumes the arc, so the player rises again. | Probe: jump, step 0.16 s, set `ko` for 3 s, step 2 s → **feet 0.43 m above ground, `grounded false`, `vy 2.03`**. Fix: land the player (`landPlayer`/`repairPlacement`) when a KO starts or inside the KO branch. |
| 6 | Carrion bones phase (render--010) | minor | ✅ | `render/dynamics.ts:229,241` | **The "flattened bones pile" lasts one frame.** `o.scale.setScalar(c.butchered ? 0.6 : 1)` runs every frame, and the bones scale `0.45` is applied only when the phase changes. The next frame resets it to 0.6 or 1, so bones look like a full carcass without haze. A related gap: haze is never added when the quality changes from `low` to `medium` while a corpse is already in the carrion phase, because the phase did not change. | Read: lines 229 and 241. `carrionFx.test.ts` covers only the point budget. Fix: compute the scale from both butchered and phase each frame. |
| 7 | Inn meals (D-INN-1) | minor | ✅ | `data/innMeals.ts:13-16,23-27` | **Every inn stops serving after about 8 game days.** Bread is a mandatory slot in all three meals and the shortest-lived pantry item (4 d × chest factor 0.5 → 8 d). Nothing refills it, so all meals turn "unavailable" while dried meat, cabbages and preserves are still in stock. Separately, a meal consumes a nearly spoiled ingredient (`fresh < 15 % spoilH`) with no illness roll, while eating the same item from the pack carries +35 % illness risk. 🟡 This may be acceptable for the slice. | Probe (seed 1337, `s1-inn-5`): daily `spoilInventory(…, 24, 0.5)` → **all meals unavailable at day 8**, with `dried_meat×6, cabbage×6, fermented_cabbage×4, salted_meat×3, carrot×4` left. Options: a bread-free tier (meat + vegetable), resupply via economy--002, or record the cliff as intended in D-INN-1. |
| 8 | Treasure spots (D-LOOT-1) | minor | ✅ | `sim/treasure.ts:173-189` | **Some spots can never be dug.** Spots are placed at 0.3–0.85 × landmark radius with no terrain check. Shipwrecks and boat wrecks sit on the shore, and `dig` refuses water deeper than 0.3 m. One shipwreck spot (richness 2) lies in 4.4 m of water, with no diggable point within the 1.6 m dig radius. | Probe (all points within 1.55 m checked): seed 1337 0/28, seed 3 0/28, **seed 42 1/28 (`lm-shipwreck-1#0`, depth 4.44 m)**. Fix: re-roll or clamp the spot onto diggable dry ground. This is deterministic and needs no save change. Add a test across seeds. |
| 9 | Mayor office lifecycle (D-SET-1) | minor | ✅ | `sim/mayor.ts:337-344,376-385`; `sim/interact.ts:275,279` | **A dead headman or deputy locks the office for good.** `headmanId` is assigned only in `createNewGame`. The `ask_office` option exists only when talking to that NPC, and dead NPCs are not targets (`interact.ts:549`). If the headman dies, the office can never be offered. If the deputy dies while the player is mayor: (a) `set_tax` (deputy-only) becomes unreachable, so a "high" rate is stuck and keeps costing 0.4 opinion per resident per day; (b) when the term is lost, `headmanId = deputyId` points at the dead NPC, which closes the office permanently. Also, development saves at `SAVE_VERSION` 9 created before `ee45c6a` have no headman at all (🟡 unreleased, so acceptable). | Read: the traced paths above. No test kills a headman or deputy. Fix: pick a successor when either dies (the same rule as `assignHeadmen`), or let the player change the tax rate from any resident or the notice board while in office. |
| 10 | Sharpen activity target | minor | ✅ | `Game.ts:470`; `sim/playerActivities.ts:38` | **The blade is stored as `inv:<index>`, but the pack can change during the 6 s activity.** `spoilInventory` splices spoiled food out of `player.inv` (`inventory.ts:241-245`), and a dropped or auto-added stack shifts indices too. The completion then sharpens another blade or reports "Nothing to sharpen", and the whetstone use is lost. `indexOf(s)` of a stack outside the pack gives `inv:-1`. | Read: traced path; the window is small. Fix: resolve the blade by a stable identity (equip slot, or id + condition match), or refuse when `indexOf` is −1. |
| 11 | Trade grouping vs. edge (D-COMBAT-4) | trivial | 🟡 | `sim/inventory.ts:34-36` (`stackLookKey`) | Two blades with equal rounded durability but different `edge` share one row in `TradePanel` (`groupIdentical`). Selling from the row may hand over the sharp one. The price ignores the edge, so no money is created or lost. | Read only. Add `edge` (rounded) to `stackLookKey`. |

### Open questions (❓)

- **Attack while guarding:** `Game.attack` does not check the guard, so a player can hold RMB (full block or parry) and swing with LMB at the same time. The combat--002 plan does not decide this. If the intent is "guard or strike", add the rule and a test.
- **Dodge or jump while airborne:** `requestDodge` does not check `grounded`. Jump, toggle combat, then Space gives a 1.5 m air-dash inside the arc. This is harmless today: there are no discrete obstacles, and #1 is the bigger traversal hole. It should be decided before gap or obstacle content exists.

### Missing tests (🟡, coverage only)

- A two-handed weapon or bow equipped through `useItem` while a shield is held (#2).
- A held guard across dodge, panel, activity and KO end (#3).
- `findFood` selects every edible item when it is alone; caravan packing of preserves (#4).
- KO while airborne (#5); bones scale (#6).
- A jump at a short steep wall near a crest (#1); the existing tolerance of 2.16 m is too loose to fail.
- Treasure-spot diggability across several seeds (#8); headman or deputy death (#9).

### Checked and fine

- **Save:** the new optional fields (`ItemStack.edge`, `px.lootTaken`, `SettlementState.headmanId/deputyId/playerMayor/taxRate`) default safely when absent, and `lootTaken` round-trips (test). Lock, guard, dodge and motion state are never serialised (test for motion), and loads construct a new `Sim`. The new activity kinds `meal` and `sharpen` hold only string refs.
- **Layering:** sim imports no render, UI or audio code. `render/actors.ts` only reads `guardOf`. The audio change is the voices bus volume plus two activity sound ids, with no sim writes.
- **Stack identity:** `canMerge` is the single rule. Merges take the minimum of fresh and dur, never an average. `removeItem` takes the oldest batch first. `completeCraft` derives preserved freshness from the weakest consumed source.
- **Edge:** quality is not counted twice (a blade at or above the base edge does full damage). Sharpening is capped at `maxEdge` and never touches `dur`. The floor holds.
- **Lock:**
  - drops on combat-off, KO, death, down or protected, range (32 m) and the look-away grace;
  - Tab outside combat still cycles interaction targets;
  - acquiring a target cancels road autopilot.
- **Fog:** `npcOverlays` filters on `isExplored`. The combat marker is limited to 25–32 m around the player, which is always explored.
- **Conservation:** treasure coins → `logMint('treasure')`. Belly loot is player-only and deterministic per corpse, and butchering is one-shot (`c.butchered`). Inn meals and lodging go to the treasury, logged. The inn pantry and household reserves are initial stock, not flows.

## Triage (session 14)

All confirmed findings fixed with tests in `src/game/sim/review019.test.ts` (+ `treasure.test.ts`, `mayor.test.ts`):

| # | Fix |
|---|---|
| 1 major | Landing stability probes ±0.25 m cardinally (`stableSupport`), a thin steep wall is refused; terrace-edge jump-spam test |
| 2 major | `Game.useItem` returns the off hand for two-handed/ranged weapons; `defenceOf` ignores a shield with them |
| 3 major | `findFood` starts at −∞ (fermented cabbage is eaten/packed). Side effect: the caravan worst-case test lost a trade → principled fix: `packCaravanProvisions` buys from households when store + warehouse fall short |
| 4 | Parry window only on a real raw release → press (`setGuard(sim, want, raw)`) |
| 5 | KO in mid-jump ends the arc (`repairPlacement`) |
| 6 | Bones scale and haze are recomputed every frame (quality switch safe) |
| 7 | Inn serves only unspoiled stock (`servable`), preserved alternatives in the first slot of every meal |
| 8 | Treasure spots under water move toward the landmark centre or are dropped (`treasureSpots(sim)`) |
| 9 | `ensureOfficeHolders` replaces dead/missing headman and deputy (also old dev saves) |
| 10 | Sharpen activity stores `inv:<index>:<id>` and falls back to the first blade of that id needing an edge |
| 11 | `stackLookKey` includes the edge |
| ❓ | Dodge refused while airborne (done); attacking while guarding stays allowed (design question for Opus/user) |

Verification: `pnpm check` 492/492, soak 10 d × 6 seeds 0 violations, e2e smoke 5/5 · acceptance 46/46 · mobile 16/16.
