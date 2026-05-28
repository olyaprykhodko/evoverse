export function stateKey(battleId: string): string {
  return `battle:${battleId}:state`;
}
