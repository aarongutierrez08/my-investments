import { useMemo } from 'react';
import type { Category, Investment } from '../../lib/types';
import {
  maxPurchaseAmount,
  minPurchaseAmount,
  standardDeviation,
} from '../../lib/purchaseAmount';
import {
  buildCategoryBreakdown,
  buildLabelBreakdown,
  buildMonthBreakdown,
  buildYearBreakdown,
  computeMedian,
} from './aggregations';

export interface BreakdownsResult {
  availableLabels: string[];
  availableCategories: Category[];
  categoryBreakdown: Map<string, { total: number; count: number }>;
  labelBreakdown: Map<string, { total: number; count: number }>;
  yearBreakdown: [string, number][];
  monthBreakdown: [string, number][];
  portfolioTotal: number;
  totalInvested: number;
  averageInvested: number;
  medianInvested: number;
  minInvested: number;
  maxInvested: number;
  stdDevInvested: number;
}

export function useBreakdowns(
  investments: Investment[],
  filteredInvestments: Investment[],
): BreakdownsResult {
  const availableLabels = useMemo(() => {
    const unique = new Set<string>();
    for (const inv of investments) {
      for (const label of inv.labels ?? []) {
        unique.add(label);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [investments]);

  const availableCategories = useMemo(() => {
    const unique = new Set<Category>();
    for (const inv of investments) {
      if (inv.category) unique.add(inv.category);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [investments]);

  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(filteredInvestments),
    [filteredInvestments],
  );

  const labelBreakdown = useMemo(
    () => buildLabelBreakdown(filteredInvestments),
    [filteredInvestments],
  );

  const yearBreakdown = useMemo(
    () => buildYearBreakdown(filteredInvestments),
    [filteredInvestments],
  );

  const monthBreakdown = useMemo(
    () => buildMonthBreakdown(filteredInvestments),
    [filteredInvestments],
  );

  const portfolioTotal = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.amount, 0),
    [investments],
  );

  const totalInvested = filteredInvestments.reduce(
    (sum, inv) => sum + inv.amount,
    0,
  );
  const totalCost = filteredInvestments.reduce(
    (sum, inv) => sum + inv.amount * inv.price,
    0,
  );
  const averageInvested =
    filteredInvestments.length === 0 ? 0 : totalCost / filteredInvestments.length;
  const medianInvested = computeMedian(filteredInvestments);
  const minInvested = minPurchaseAmount(filteredInvestments);
  const maxInvested = maxPurchaseAmount(filteredInvestments);
  const stdDevInvested = standardDeviation(filteredInvestments);

  return {
    availableLabels,
    availableCategories,
    categoryBreakdown,
    labelBreakdown,
    yearBreakdown,
    monthBreakdown,
    portfolioTotal,
    totalInvested,
    averageInvested,
    medianInvested,
    minInvested,
    maxInvested,
    stdDevInvested,
  };
}
