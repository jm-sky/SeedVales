# UI English glossary (UI-LANG-01)

All player-facing text is English (`docs/IMPORTANT-PRODUCT-NOTES.md`, decision D-UI-4). This glossary keeps
terms consistent across `data/`, `sim/` messages, `Game.ts` and `ui/`. Tone: plain, medieval-flavoured but not
archaic; sentence case for labels and buttons ("Save game", not "Save Game"); messages are short sentences
ending with a period; 2nd person for the player ("You need an axe.").

**Proper nouns stay as they are**: settlement names (Jaworzno, Głogów Dolny, Wrzosowo…), NPC names, the game
name. They are names of places/people in the world, not UI text.

## Items (`data/items.ts`)

| id | English | id | English |
|---|---|---|---|
| log | Log | branch | Branch |
| stone | Stone | rock_chunk | Rock chunk |
| coal | Coal | iron_ore / copper_ore / gold_ore | Iron ore / Copper ore / Gold ore |
| iron_ingot | Iron ingot | hide | Hide |
| wool | Wool | bone | Bones |
| antler | Antler | cloth | Cloth |
| rope | Rope | shell / pearl_shell | Shell / Pearl shell |
| grain | Grain | berries | Berries |
| apple | Apple | mushroom | Mushroom |
| carrot / cabbage / tomato | Carrot / Cabbage / Tomato | egg / milk | Egg / Milk |
| bread | Bread | raw_meat / cooked_meat / dried_meat | Raw meat / Roast meat / Dried meat |
| stew | Stew | mint / chamomile / yarrow | Mint / Chamomile / Yarrow |
| arnica / hemlock / nightshade | Arnica / Hemlock / Nightshade | axe / shovel / pickaxe | Axe / Shovel / Pickaxe |
| pan / pot | Pan / Pot | hammer | Hammer |
| torch | Torch | flint | Flint and steel |
| bucket | Bucket | waterskin_s/m/l | Waterskin (S/M/L) |
| sewing_kit | Sewing kit | backpack / saddlebag | Backpack / Saddlebags |
| knife / dagger | Knife / Dagger | short_sword / sword / long_sword | Short sword / Sword / Longsword |
| small_axe / big_axe | Hatchet / Battle axe | spear | Spear |
| war_hammer / club / staff | War hammer / Club / Staff | short_bow / long_bow / composite_bow | Short bow / Longbow / Composite bow |
| sling / crossbow | Sling / Crossbow | padded_jacket | Gambeson |
| leather_jerkin | Leather jerkin | studded_leather | Studded leather |
| chainmail / plate_cuirass | Mail shirt / Plate cuirass | leather_cap / iron_helm | Leather cap / Iron helm |
| leather_boots / leather_trousers / leather_gloves | Leather boots / Leather trousers / Leather gloves | bracers / pauldrons | Bracers / Pauldrons |
| bandage / salve | Bandage / Herbal salve | herbal_tea | Herbal tea |
| blanket / tent / furs | Blanket / Tent / Fur bedding | arrow / arrow_bodkin / arrow_blunt | Arrow (broadhead) / Arrow (bodkin) / Arrow (blunt) |
| bolt / bolt_heavy / bolt_blunt | Bolt / Heavy bolt / Blunt bolt | sling_stone | Sling stone |

## Buildings and places

House, Well, Campfire, Notice board, Settlement warehouse, Market stall, Inn, Field, Pen, Anvil, Woodpile,
Drying rack, Herb garden, Torch post, Trough, Palisade, Shed, Bridge, Spit (roasting spit), Building site,
Den / Lair, Rat nest. Settlement sizes: SM/MD/LG/XL shown as-is.

## Game terms

| Polish | English |
|---|---|
| Zdrowie / Stamina / Wigor / Sytość / Nawodnienie | Health / Stamina / Vigor / Satiety / Hydration |
| Ekwipunek / Postać / Wytwarzanie / Budowa / Szybkie akcje / Zadania / Mapa / Menu | Inventory / Character / Crafting / Building / Quick actions / Quests / Map / Menu |
| Walka / Skradanie / Bieg / Akcja / Atak / Naciąg / Broń / Cel | Combat / Sneak / Run / Action / Attack / Draw / Weapon / Target |
| Reputacja: Uczciwość / Uczynność / Rozpoznawalność / Odwaga | Reputation: Honesty / Helpfulness / Renown / Courage |
| Umiejętności / Atrybuty | Skills / Attributes |
| Świeżość / Jakość / Waga / Wartość / Wytrzymałość | Freshness / Quality / Weight / Value / Durability |
| jakość: niska / średnia / wysoka / wyjątkowa | quality: poor / average / good / exceptional |
| Handel / Kup / Sprzedaj | Trade / Buy / Sell |
| Zamówienie / zaliczka | Order / deposit |
| Skrzynia / Magazyn | Chest / Warehouse |
| Zapisz grę / Wczytaj / Nowa gra / Ustawienia | Save game / Load / New game / Settings |
| monety (m) | coins (c) — money suffix `c` |
| pory roku: Wiosna / Lato / Jesień / Zima | Spring / Summer / Autumn / Winter |
| pogoda: Słonecznie / Pochmurno / Deszcz / Burza / Śnieg / Mgła | Clear / Overcast / Rain / Storm / Snow / Fog |
| obrażenia: cięte / kłute / obuchowe | damage: cut / pierce / blunt |
| Skill names | Medicine, Sneaking, Survival, Trapping, Melee, Ranged, Construction, Blacksmithing, Woodcutting, Farming, Trading |
| Professions | Farmer, Woodcutter, Hunter, Blacksmith, Trader, Herbalist, Shepherd, Guard (match ids in `data/professions.ts`) |
| Towarzysz / Najmij / Eskorta / Ochrona / Ryzyko | Companion / Hire / Escort / Protection / Risk (Low risk / Some risk / Dangerous) |
| Prezent / Daj / Zakończ umowę / Rozstań się | Gift / Give / End the contract / Part ways |
