export const TABLE_IDS = ['table-1', 'table-2', 'table-3'] as const;

export const TABLE_BETTING_TTL = 45;

export const TABLE_NAMES: Record<string, string> = {
  'table-1': 'Pink Table',
  'table-2': 'Green Table',
  'table-3': 'Yellow Table',
};

export const TABLE_INITIAL_TTL: Record<string, number> = {
  'table-1': TABLE_BETTING_TTL,
  'table-2': Math.floor((TABLE_BETTING_TTL * 2) / 3),
  'table-3': Math.floor(TABLE_BETTING_TTL / 3),
};
