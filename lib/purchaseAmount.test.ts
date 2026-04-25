import { describe, it, expect } from 'vitest';
import {
  minPurchaseAmount,
  maxPurchaseAmount,
  standardDeviation,
} from './purchaseAmount';
import type { Investment } from './types';

function makeInvestment(amount: number, price: number): Investment {
  return {
    id: 'i',
    instrument: 'X',
    amount,
    price,
    purchaseDate: '2023-01-01',
    category: 'Stocks',
    labelIds: [],
  };
}

describe('minPurchaseAmount', () => {
  it('returns the smallest amount * price value', () => {
    const investments = [
      makeInvestment(10, 5),
      makeInvestment(2, 100),
      makeInvestment(7, 3),
    ];

    expect(minPurchaseAmount(investments)).toBe(21);
  });

  it('returns 0 for an empty list', () => {
    expect(minPurchaseAmount([])).toBe(0);
  });

  it('returns the single purchase amount when only one investment is given', () => {
    expect(minPurchaseAmount([makeInvestment(4, 25)])).toBe(100);
  });

  it('returns the tied value once when two entries share the smallest amount', () => {
    const investments = [
      makeInvestment(5, 10),
      makeInvestment(5, 10),
      makeInvestment(8, 10),
    ];

    expect(minPurchaseAmount(investments)).toBe(50);
  });
});

describe('maxPurchaseAmount', () => {
  it('returns the largest amount * price value', () => {
    const investments = [
      makeInvestment(10, 5),
      makeInvestment(2, 100),
      makeInvestment(7, 3),
    ];

    expect(maxPurchaseAmount(investments)).toBe(200);
  });

  it('returns 0 for an empty list', () => {
    expect(maxPurchaseAmount([])).toBe(0);
  });

  it('returns the single purchase amount when only one investment is given', () => {
    expect(maxPurchaseAmount([makeInvestment(4, 25)])).toBe(100);
  });

  it('returns the tied value once when two entries share the largest amount', () => {
    const investments = [
      makeInvestment(5, 10),
      makeInvestment(10, 10),
      makeInvestment(10, 10),
    ];

    expect(maxPurchaseAmount(investments)).toBe(100);
  });
});

describe('standardDeviation', () => {
  it('returns 0 for an empty list', () => {
    expect(standardDeviation([])).toBe(0);
  });

  it('returns 0 when only one investment is given', () => {
    expect(standardDeviation([makeInvestment(4, 25)])).toBe(0);
  });

  it('returns the population standard deviation of amount * price for multiple investments', () => {
    const investments = [
      makeInvestment(100, 1),
      makeInvestment(200, 1),
      makeInvestment(300, 1),
    ];

    expect(standardDeviation(investments)).toBeCloseTo(81.6497, 4);
  });

  it('returns 0 when all purchase amounts are identical', () => {
    const investments = [
      makeInvestment(10, 5),
      makeInvestment(5, 10),
      makeInvestment(25, 2),
    ];

    expect(standardDeviation(investments)).toBe(0);
  });
});
