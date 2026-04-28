import { useMemo } from 'react';
import type { Investment } from '../../lib/types';
import { filterInvestments, parseAmountBound } from './filterInvestments';
import { sortInvestments } from './sortInvestments';
import type { FiltersState } from './useFilters';
import type { SortState } from './useSort';

export interface FilteredInvestmentsResult {
  filteredInvestments: Investment[];
  displayedInvestments: Investment[];
  isFiltered: boolean;
  hasActiveFilters: boolean;
}

export function useFilteredInvestments(
  investments: Investment[],
  filters: FiltersState,
  sort: SortState,
): FilteredInvestmentsResult {
  const minAmountBound = parseAmountBound(filters.minAmount);
  const maxAmountBound = parseAmountBound(filters.maxAmount);

  const filteredInvestments = useMemo(
    () =>
      filterInvestments(investments, {
        categoryFilter: filters.categoryFilter,
        labelFilter: filters.labelFilter,
        nameSearch: filters.nameSearch,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        minAmountBound,
        maxAmountBound,
        onlyWithNotes: filters.onlyWithNotes,
      }),
    [
      investments,
      filters.categoryFilter,
      filters.labelFilter,
      filters.nameSearch,
      filters.fromDate,
      filters.toDate,
      minAmountBound,
      maxAmountBound,
      filters.onlyWithNotes,
    ],
  );

  const displayedInvestments = useMemo(
    () =>
      sortInvestments(filteredInvestments, {
        sortDirection: sort.sortDirection,
        dateSortDirection: sort.dateSortDirection,
        nameSortDirection: sort.nameSortDirection,
        categorySortDirection: sort.categorySortDirection,
        labelSortDirection: sort.labelSortDirection,
        notesSortDirection: sort.notesSortDirection,
      }),
    [
      filteredInvestments,
      sort.sortDirection,
      sort.dateSortDirection,
      sort.nameSortDirection,
      sort.categorySortDirection,
      sort.labelSortDirection,
      sort.notesSortDirection,
    ],
  );

  const isFiltered =
    filters.categoryFilter !== '' ||
    filters.labelFilter !== '' ||
    filters.nameSearch.trim() !== '' ||
    filters.fromDate !== '' ||
    filters.toDate !== '' ||
    minAmountBound !== null ||
    maxAmountBound !== null ||
    filters.onlyWithNotes;

  const hasActiveFilters =
    filters.categoryFilter !== '' ||
    filters.labelFilter !== '' ||
    filters.nameSearch !== '' ||
    filters.fromDate !== '' ||
    filters.toDate !== '' ||
    filters.minAmount !== '' ||
    filters.maxAmount !== '' ||
    filters.onlyWithNotes;

  return {
    filteredInvestments,
    displayedInvestments,
    isFiltered,
    hasActiveFilters,
  };
}
