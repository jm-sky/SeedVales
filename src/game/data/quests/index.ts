/**
 * Authored quests, in offer-check order (docs/design/quests-engine.md §1).
 * @domain quests
 */
import type { QuestDef } from './types'
import { G01 } from './g01'
import { G02 } from './g02'
import { G03 } from './g03'
import { G04 } from './g04'
import { G05 } from './g05'
import { G06 } from './g06'
import { G07 } from './g07'
import { G08 } from './g08'
import { Q01 } from './q01'
import { Q03 } from './q03'
import { Q04 } from './q04'
import { Q07 } from './q07'
import { Q08 } from './q08'
import { Q09 } from './q09'

export const AUTHORED_QUESTS: readonly QuestDef[] = [Q03, Q07, G03, G01, G08, G04, Q09, Q01, G07, G02, Q04, G06, Q08, G05]
