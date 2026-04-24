import type { Investment } from './types';

export function minPurchaseAmount(investments: Investment[]): number {
  if (investments.length === 0) return 0;
  return investments.reduce((min, inv) => {
    const value = inv.amount * inv.price;
    return value < min ? value : min;
  }, Infinity);
}

export function maxPurchaseAmount(investments: Investment[]): number {
  if (investments.length === 0) return 0;
  return investments.reduce((max, inv) => {
    const value = inv.amount * inv.price;
    return value > max ? value : max;
  }, -Infinity);
}

export function standardDeviation(investments: Investment[]): number {
  if (investments.length === 0) return 0;
  const values = investments.map((inv) => inv.amount * inv.price);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
