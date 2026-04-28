import { useState } from 'react';
import type { NotesSortDirection, SortDirection } from './types';

export interface SortState {
  sortDirection: SortDirection;
  dateSortDirection: SortDirection;
  nameSortDirection: SortDirection;
  categorySortDirection: SortDirection;
  labelSortDirection: SortDirection;
  notesSortDirection: NotesSortDirection;
  cycleSortDirection: () => void;
  cycleDateSortDirection: () => void;
  cycleNameSortDirection: () => void;
  cycleCategorySortDirection: () => void;
  cycleLabelSortDirection: () => void;
  cycleNotesSortDirection: () => void;
}

type SortKey = 'amount' | 'date' | 'name' | 'category' | 'label' | 'notes';

export function useSort(): SortState {
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);
  const [nameSortDirection, setNameSortDirection] = useState<SortDirection>(null);
  const [categorySortDirection, setCategorySortDirection] = useState<SortDirection>(null);
  const [labelSortDirection, setLabelSortDirection] = useState<SortDirection>(null);
  const [notesSortDirection, setNotesSortDirection] = useState<NotesSortDirection>(null);

  function clearOthers(except: SortKey) {
    if (except !== 'amount') setSortDirection(null);
    if (except !== 'date') setDateSortDirection(null);
    if (except !== 'name') setNameSortDirection(null);
    if (except !== 'category') setCategorySortDirection(null);
    if (except !== 'label') setLabelSortDirection(null);
    if (except !== 'notes') setNotesSortDirection(null);
  }

  function cycleSortDirection() {
    clearOthers('amount');
    setSortDirection((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }

  function cycleDateSortDirection() {
    clearOthers('date');
    setDateSortDirection((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }

  function cycleNameSortDirection() {
    clearOthers('name');
    setNameSortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }

  function cycleCategorySortDirection() {
    clearOthers('category');
    setCategorySortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }

  function cycleLabelSortDirection() {
    clearOthers('label');
    setLabelSortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }

  function cycleNotesSortDirection() {
    clearOthers('notes');
    setNotesSortDirection((prev) => {
      if (prev === null) return 'withFirst';
      if (prev === 'withFirst') return 'withoutFirst';
      return null;
    });
  }

  return {
    sortDirection,
    dateSortDirection,
    nameSortDirection,
    categorySortDirection,
    labelSortDirection,
    notesSortDirection,
    cycleSortDirection,
    cycleDateSortDirection,
    cycleNameSortDirection,
    cycleCategorySortDirection,
    cycleLabelSortDirection,
    cycleNotesSortDirection,
  };
}
