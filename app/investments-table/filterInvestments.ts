import type { Investment } from '../../lib/types';

interface FilterInputs {
  categoryFilter: string;
  labelFilter: string;
  nameSearch: string;
  fromDate: string;
  toDate: string;
  minAmountBound: number | null;
  maxAmountBound: number | null;
  onlyWithNotes: boolean;
}

export function filterInvestments(
  investments: Investment[],
  inputs: FilterInputs,
): Investment[] {
  const trimmedSearch = inputs.nameSearch.trim().toLowerCase();
  return investments.filter((investment) => {
    if (inputs.categoryFilter && investment.category !== inputs.categoryFilter) {
      return false;
    }
    if (inputs.labelFilter && !(investment.labels ?? []).includes(inputs.labelFilter)) {
      return false;
    }
    if (trimmedSearch) {
      const nameMatches = investment.instrument.toLowerCase().includes(trimmedSearch);
      const labelMatches = (investment.labels ?? []).some((label) =>
        label.toLowerCase().includes(trimmedSearch),
      );
      const notesMatches = (investment.notes ?? '').toLowerCase().includes(trimmedSearch);
      if (!nameMatches && !labelMatches && !notesMatches) {
        return false;
      }
    }
    if (inputs.fromDate || inputs.toDate) {
      const purchaseDate = investment.purchaseDate || '';
      if (!purchaseDate) return false;
      if (inputs.fromDate && purchaseDate < inputs.fromDate) return false;
      if (inputs.toDate && purchaseDate > inputs.toDate) return false;
    }
    if (inputs.minAmountBound !== null && investment.amount < inputs.minAmountBound) {
      return false;
    }
    if (inputs.maxAmountBound !== null && investment.amount > inputs.maxAmountBound) {
      return false;
    }
    if (inputs.onlyWithNotes && (investment.notes ?? '').trim() === '') {
      return false;
    }
    return true;
  });
}

export function parseAmountBound(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
