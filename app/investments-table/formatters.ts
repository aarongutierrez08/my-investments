export function investmentCountSuffix(count: number): string {
  return ` · ${count} ${count === 1 ? 'investment' : 'investments'}`;
}
