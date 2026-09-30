# Developer Calibration Tools

## Proposal

Consider adding a small developer-only **Tools / Lab** area for fast calibration and inspection of game content without having to start the full game and manually locate the relevant object.

Possible modules:

- **Asset / Model Lab** — inspect glTF/GLB models, scale, rotation, pivot, ground offset and reference size.
- **Character / Animal Lab** — preview NPCs and animals, animations, colliders and proportions.
- **Equipment Lab** — inspect weapons, armor and items; tune position, scale, rotation and attachment points.
- **Building Lab** — inspect buildings, footprint, doors, colliders, interaction/work points and decorative details.
- **World / Environment Lab** — inspect vegetation, rocks, terrain details, density, LOD and placement rules.
- Later: **Combat Lab** and **AI / Simulation Lab** for controlled, repeatable calibration scenarios.

## Principle

These tools should reuse the **same production code, data, loaders, renderers and configuration as the game**. They should provide minimal controlled environments around production systems, not create a second parallel implementation or mini-engine.

When a system requires repeated visual or numerical tuning, prefer a deterministic calibration scene/harness over reproducing the state manually in the full game.

This is a proposal for review, not yet a mandatory implementation requirement.
