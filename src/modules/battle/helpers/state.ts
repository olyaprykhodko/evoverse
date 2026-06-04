export function stateKey(battleId: string): string {
  return `battle:${battleId}:state`;
}

export function deadlineMember(battleId: string, round: number): string {
  return `${battleId}:${round}`;
}
