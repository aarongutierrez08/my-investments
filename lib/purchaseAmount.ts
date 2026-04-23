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
