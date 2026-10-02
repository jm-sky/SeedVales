/**
 * Authored quests, in offer-check order (docs/design/quests-engine.md §1).
 * @domain quests
 */
import type { QuestDef } from './types'
import { G01 } from './g01'
import { G03 } from './g03'
import { Q03 } from './q03'
import { Q07 } from './q07'

export const AUTHORED_QUESTS: readonly QuestDef[] = [Q03, Q07, G03, G01]
