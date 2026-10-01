export type CharacterTab = 'overview' | 'skills' | 'reputation' | 'weapons'

export const CHARACTER_TABS: { id: CharacterTab; label: string }[] = [
  { id: 'overview', label: 'Character & health' },
  { id: 'skills', label: 'Attributes & skills' },
  { id: 'reputation', label: 'Reputation' },
  { id: 'weapons', label: 'Primary weapons' },
]
