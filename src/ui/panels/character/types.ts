export type CharacterTab = 'overview' | 'skills' | 'reputation' | 'weapons'

export const CHARACTER_TABS: { id: CharacterTab; label: string }[] = [
  { id: 'overview', label: 'Postać i zdrowie' },
  { id: 'skills', label: 'Atrybuty i umiejętności' },
  { id: 'reputation', label: 'Reputacja' },
  { id: 'weapons', label: 'Broń podstawowa' },
]
