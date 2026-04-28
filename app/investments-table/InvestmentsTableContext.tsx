'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Category, Investment, Label } from '../../lib/types';
import { useBreakdowns } from './useBreakdowns';
import { useDeleteInvestment, type DeleteState } from './useDeleteInvestment';
import { useFilteredInvestments } from './useFilteredInvestments';
import { useFilters, type FiltersState } from './useFilters';
import { useSort, type SortState } from './useSort';

interface InvestmentsTableContextValue {
  investments: Investment[];
  labelsData: Label[];
  filters: FiltersState;
  sort: SortState;
  delete: DeleteState;
  availableLabels: string[];
  availableCategories: Category[];
  filteredInvestments: Investment[];
  displayedInvestments: Investment[];
  totalInvested: number;
  averageInvested: number;
  medianInvested: number;
  minInvested: number;
  maxInvested: number;
  stdDevInvested: number;
  hasActiveFilters: boolean;
  isFiltered: boolean;
  filteredCount: number;
  categoryBreakdown: Map<string, { total: number; count: number }>;
  labelBreakdown: Map<string, { total: number; count: number }>;
  yearBreakdown: [string, number][];
  monthBreakdown: [string, number][];
  portfolioTotal: number;
}

const InvestmentsTableContext = createContext<InvestmentsTableContextValue | null>(
  null,
);

export function useInvestmentsTableContext(): InvestmentsTableContextValue {
  const ctx = useContext(InvestmentsTableContext);
  if (ctx === null) {
    throw new Error(
      'useInvestmentsTableContext must be used inside InvestmentsTableProvider',
    );
  }
  return ctx;
}

interface InvestmentsTableProviderProps {
  investments: Investment[];
  labelsData: Label[];
  children: ReactNode;
}

export function InvestmentsTableProvider({
  investments,
  labelsData,
  children,
}: InvestmentsTableProviderProps) {
  const filters = useFilters();
  const sort = useSort();
  const deleteState = useDeleteInvestment();
  const { filteredInvestments, displayedInvestments, isFiltered, hasActiveFilters } =
    useFilteredInvestments(investments, filters, sort);
  const breakdowns = useBreakdowns(investments, filteredInvestments);

  const value: InvestmentsTableContextValue = {
    investments,
    labelsData,
    filters,
    sort,
    delete: deleteState,
    filteredInvestments,
    displayedInvestments,
    isFiltered,
    hasActiveFilters,
    filteredCount: filteredInvestments.length,
    ...breakdowns,
  };

  return (
    <InvestmentsTableContext.Provider value={value}>
      {children}
    </InvestmentsTableContext.Provider>
  );
}
