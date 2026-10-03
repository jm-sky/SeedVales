# Roadmap priority adjustments

**Status:** decisions to apply to the main roadmap  
**Created:** 2026-10-03  
**Purpose:** concise author decisions for the next roadmap update. This file does not replace the main roadmap; it is an input for updating it.

## Decisions

### 1. Rare Damascus / obsidian items should arrive earlier

Do not keep all Damascus/obsidian content blocked behind the late `QUAL-02` technology system.

Introduce a smaller earlier slice:

- rare Damascus weapons (for example dagger, sword);
- rare obsidian weapons/tools where appropriate (for example knife/dagger);
- these items may appear as treasure/rare loot;
- they may also be sold rarely by selected merchants or blacksmiths;
- they should be expensive and uncommon.

Full production/crafting technology for Damascus steel or obsidian may remain later. The earlier slice is primarily about obtaining and using rare items, not implementing the complete technology chain.

### 2. Desert should be separated from the large WORLD-06 package

A desert biome is wanted, but it is not currently a top-priority feature.

Do not require:

- additional continents;
- sea transport;
- the entire WORLD-06 expansion

just to add desert terrain.

Treat "additional biome(s) on the existing continent" separately from "additional continents and intercontinental transport". Desert may be scheduled earlier when world-generation work makes it convenient, but it should not displace higher-priority exploration/content work.

### 3. Caves should move substantially earlier

Caves are important and should not remain near the end of the later backlog.

Preferred dependency/order:

`current render/verification work -> authored quest foundation -> landmarks + basic treasure/loot -> caves + cave loot -> larger economy/transport/society expansions`

Caves should therefore arrive before large later systems such as:

- expanded inter-settlement economy;
- riding and animal-drawn carts;
- living-society/demography work.

The exact implementation plan can still account for generator, interior rendering/camera, save/performance and loot dependencies.

### 4. Living society remains late

Family/social relationship expansion, multi-generation demography, ageing, funerals and the larger "living society" scope do not need to move earlier.

Keep this work late and design its exact slice separately before implementation.

### 5. Additional continents move further out

Additional continents and intercontinental/sea transport are not part of the near roadmap.

Keep them deferred beyond the current planned roadmap unless the author explicitly revisits the decision.

Do not couple new biomes on the existing continent to this work.

### 6. DEV-01 code-map generation is dropped

The generated code map based on JSDoc/domain tags was only potentially useful during development and is no longer worth prioritising.

Remove `DEV-01` from L1 / the active roadmap and mark it as not planned/dropped rather than rescheduling it.

## Priority principle

Prefer earlier work that increases exploration, world variety and meaningful discoverable content.

In particular:

- caves: high priority relative to the current later backlog;
- rare special items: move earlier;
- desert: wanted, but opportunistic / medium-low priority;
- heavy society simulation and world-scale expansion: keep later.

## Roadmap update instruction

When applying these decisions:

1. preserve the existing roadmap structure where possible;
2. split overly broad feature groups instead of moving an entire large feature package forward;
3. update `FEATURES.json`, roadmap references and decisions consistently if IDs/scopes/statuses change;
4. do not silently change already agreed implementation dependencies or verification gates;
5. record any new split IDs / decisions in the normal project documentation.
