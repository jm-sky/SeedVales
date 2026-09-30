# Important Product Notes

This file contains important cross-cutting product requirements that should be considered alongside `docs/VISION.md` and `docs/VISION-APPENDIX.md`.

## UI language

- All player-facing UI text must be in **English**, not Polish.
- This includes menus, HUD labels, buttons, tooltips, notifications, dialogs, item names/descriptions, quest UI, map labels, settings, and error messages visible to the player.
- Internal documentation, code comments, debug tooling, and developer-facing diagnostics do not have to follow this rule unless they are also shown to the player.

## Map visibility and Fog of War

### v1 — discovered world

The world map must use **Fog of War**:

- Only areas already discovered by the player are visible on the map.
- Undiscovered areas remain hidden.
- Discovery is persistent: once an area has been explored, its terrain/location information remains revealed on the map.

This is a **v1 requirement**.

### v2 — current sensory visibility

A later visibility layer should make NPCs and animals visible only when the player character can currently perceive them.

Examples of factors that may affect the effective sensing/visibility range:

- character perception,
- distance,
- day/night and available light,
- fatigue,
- other future sensory modifiers.

NPCs and animals outside the current sensory range should not be shown merely because the surrounding terrain was discovered earlier. This should preserve uncertainty and allow occasional surprise encounters.

The exact sensing model and ranges are **TBD**. This is currently a **v2 requirement**.

### Important distinction

Persistent map discovery and current actor visibility are separate systems:

- **Fog of War** answers: “Has the player discovered this place before?”
- **Sensory visibility** answers: “Can the player perceive this NPC or animal right now?”
