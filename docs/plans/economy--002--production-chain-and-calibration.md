# Production chain (forge), item availability tiers, maintenance and price calibration

**Status:** draft  
**Model:** opus — economy model, price bands, availability tiers; sonnet — implementation, audits, soak checks  
**Domain:** economy  
**Sub domains:** crafting, trade, items, npc, buildings  
**Roadmap:** [later-vision-backlog](../roadmap/later-vision-backlog.md) stage **L3** (economy between settlements, with TRADE-03 and the NPC-06 slice)  
**Created:** 2026-10-02  
**Finished:** —

---

Sources: [recon 013](../reviews/2026-10-02--013--full-repository-recon.md) M-08 (smelting at an anvil), M-10 (recipe value ratios), C-05 (household background production), C-06 (skill gain ignores recipe complexity), G-01 (forge chain), G-02 (availability tiers / regional trade), G-06 (equipment maintenance); D-TRANS-2 (cart wear); D-VERIFY-1 (blacksmiths idle at the stock cap — no demand); soak report 015. Session 13 already added the recipe economy audit, the reachability audit with `availability` tiers, and the order-price floor (recon batch B) — this plan uses them as gates.

## Steps

| # | Step | Model |
|---|---|---|
| 0 | Economy note: price = material + labour + rarity + durability + skill barrier + local scarcity; accepted ratio bands per recipe class (from the audit); which items are local / specialist / rare / unique / import (G-02); where demand comes from in a calm world (traders buying tools for other settlements, wear) | opus |
| 1 | Forge/furnace structure: ore + fuel → ingot at the forge, forging at the anvil (M-08, G-01); blacksmith duty uses it; save/GEN implications decided in step 0 | sonnet |
| 2 | Availability tiers in trader stock and smith orders by settlement size/profession (G-02); dead `future` items activated where a channel exists | sonnet |
| 3 | Maintenance: sharpening/handle repair/armour patching/smith repair as material sinks with thresholds (G-06); cart wear + repair (D-TRANS-2) | sonnet |
| 4 | Price recalibration within the bands (M-10) + skill gain by recipe complexity with diminishing returns (C-06) | sonnet, bands by opus |
| 5 | Household background production as explicit budgets per profession/structures (C-05), still a named ledger source | sonnet |
| 6 | Gates: recipe audit inside bands (exceptions documented), reachability audit green, soak 10 days × 3 seeds — blacksmith works on ≥ 80 % of days without the cap exemption, conservation 0, treasuries in bounds | — |
