import type { Investment } from '../../lib/types';
import type { NotesSortDirection, SortDirection } from './types';

function hasNotes(investment: Investment): boolean {
  return (investment.notes ?? '').trim() !== '';
}

function firstLabel(investment: Investment): string | null {
  const labels = investment.labels ?? [];
  if (labels.length === 0) return null;
  return [...labels].sort((x, y) =>
    x.localeCompare(y, undefined, { sensitivity: 'base' }),
  )[0];
}

interface SortInputs {
  sortDirection: SortDirection;
  dateSortDirection: SortDirection;
  nameSortDirection: SortDirection;
  categorySortDirection: SortDirection;
  labelSortDirection: SortDirection;
  notesSortDirection: NotesSortDirection;
}

export function sortInvestments(
  filtered: Investment[],
  inputs: SortInputs,
): Investment[] {
  const {
    sortDirection,
    dateSortDirection,
    nameSortDirection,
    categorySortDirection,
    labelSortDirection,
    notesSortDirection,
  } = inputs;

  if (sortDirection !== null) {
    return [...filtered].sort((a, b) =>
      sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount,
    );
  }
  if (dateSortDirection !== null) {
    return [...filtered].sort((a, b) => {
      const aDate = a.purchaseDate || '';
      const bDate = b.purchaseDate || '';
      if (aDate === bDate) return 0;
      if (aDate === '') return 1;
      if (bDate === '') return -1;
      if (dateSortDirection === 'asc') return aDate < bDate ? -1 : 1;
      return aDate < bDate ? 1 : -1;
    });
  }
  if (nameSortDirection !== null) {
    return [...filtered].sort((a, b) => {
      const cmp = a.instrument.localeCompare(b.instrument, undefined, {
        sensitivity: 'base',
      });
      return nameSortDirection === 'asc' ? cmp : -cmp;
    });
  }
  if (categorySortDirection !== null) {
    return [...filtered].sort((a, b) => {
      const aCategory = (a.category as string | undefined) ?? '';
      const bCategory = (b.category as string | undefined) ?? '';
      if (aCategory === '' && bCategory === '') return 0;
      if (aCategory === '') return 1;
      if (bCategory === '') return -1;
      const cmp = aCategory.localeCompare(bCategory, undefined, {
        sensitivity: 'base',
      });
      return categorySortDirection === 'asc' ? cmp : -cmp;
    });
  }
  if (labelSortDirection !== null) {
    return [...filtered].sort((a, b) => {
      const aFirst = firstLabel(a);
      const bFirst = firstLabel(b);
      if (aFirst === null && bFirst === null) return 0;
      if (aFirst === null) return 1;
      if (bFirst === null) return -1;
      const cmp = aFirst.localeCompare(bFirst, undefined, { sensitivity: 'base' });
      return labelSortDirection === 'asc' ? cmp : -cmp;
    });
  }
  if (notesSortDirection !== null) {
    return [...filtered].sort((a, b) => {
      const aHas = hasNotes(a);
      const bHas = hasNotes(b);
      if (aHas !== bHas) {
        if (notesSortDirection === 'withFirst') return aHas ? -1 : 1;
        return aHas ? 1 : -1;
      }
      return b.amount - a.amount;
    });
  }
  return filtered;
}
