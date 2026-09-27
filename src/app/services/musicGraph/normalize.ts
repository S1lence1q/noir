export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+(?:feat\.?|featuring|ft\.?).*$/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function cleanName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
