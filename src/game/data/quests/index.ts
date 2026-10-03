/**
 * Authored quests, in offer-check order (docs/design/quests-engine.md §1).
 * @domain quests
 */
import type { QuestDef } from './types'
import { G01 } from './g01'
import { G03 } from './g03'
import { G04 } from './g04'
import { G08 } from './g08'
import { Q03 } from './q03'
import { Q07 } from './q07'
import { Q09 } from './q09'

export const AUTHORED_QUESTS: readonly QuestDef[] = [Q03, Q07, G03, G01, G08, G04, Q09]
