export function tableMetaKey(tableId: string) {
  return `roulette:table:${tableId}:meta`;
}
export function tableBetsKey(tableId: string) {
  return `roulette:table:${tableId}:bets`;
}
export function tableLockKey(tableId: string) {
  return `roulette:table:${tableId}:lock`;
}
