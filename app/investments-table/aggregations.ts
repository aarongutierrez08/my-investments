import type { Investment } from '../../lib/types';

export const UNCATEGORIZED = 'Uncategorized';

export function buildCategoryBreakdown(
  filtered: Investment[],
): Map<string, { total: number; count: number }> {
  const breakdown = new Map<string, { total: number; count: number }>();
  for (const inv of filtered) {
    const key = (inv.category as string | undefined) || UNCATEGORIZED;
    const existing = breakdown.get(key) ?? { total: 0, count: 0 };
    breakdown.set(key, {
      total: existing.total + inv.amount,
      count: existing.count + 1,
    });
  }
  return breakdown;
}

export function buildLabelBreakdown(
  filtered: Investment[],
): Map<string, { total: number; count: number }> {
  const breakdown = new Map<string, { total: number; count: number }>();
  for (const inv of filtered) {
    for (const label of inv.labels ?? []) {
      const existing = breakdown.get(label) ?? { total: 0, count: 0 };
      breakdown.set(label, {
        total: existing.total + inv.amount,
        count: existing.count + 1,
      });
    }
  }
  return new Map(
    Array.from(breakdown.entries()).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function buildYearBreakdown(filtered: Investment[]): [string, number][] {
  const breakdown = new Map<string, number>();
  for (const inv of filtered) {
    const purchaseDate = inv.purchaseDate || '';
    if (!purchaseDate) continue;
    const year = purchaseDate.slice(0, 4);
    if (year.length !== 4) continue;
    breakdown.set(year, (breakdown.get(year) ?? 0) + inv.amount);
  }
  return Array.from(breakdown.entries()).sort(([a], [b]) => b.localeCompare(a));
}

export function buildMonthBreakdown(filtered: Investment[]): [string, number][] {
  const breakdown = new Map<string, number>();
  for (const inv of filtered) {
    const purchaseDate = inv.purchaseDate || '';
    if (!purchaseDate) continue;
    const month = purchaseDate.slice(0, 7);
    if (month.length !== 7) continue;
    breakdown.set(
      month,
      (breakdown.get(month) ?? 0) + inv.amount * inv.price,
    );
  }
  return Array.from(breakdown.entries()).sort(([a], [b]) => b.localeCompare(a));
}

export function computeMedian(filtered: Investment[]): number {
  if (filtered.length === 0) return 0;
  const values = filtered
    .map((inv) => inv.amount * inv.price)
    .sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];
}
