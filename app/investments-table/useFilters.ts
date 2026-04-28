import { useState } from 'react';
import type { CategoryFilter } from './types';

export interface FiltersState {
  categoryFilter: CategoryFilter;
  setCategoryFilter: (value: CategoryFilter) => void;
  labelFilter: string;
  setLabelFilter: (value: string) => void;
  nameSearch: string;
  setNameSearch: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  onlyWithNotes: boolean;
  setOnlyWithNotes: (value: boolean) => void;
  clearFilters: () => void;
}

export function useFilters(): FiltersState {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [nameSearch, setNameSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [onlyWithNotes, setOnlyWithNotes] = useState<boolean>(false);

  function clearFilters() {
    setCategoryFilter('');
    setLabelFilter('');
    setNameSearch('');
    setFromDate('');
    setToDate('');
    setMinAmount('');
    setMaxAmount('');
    setOnlyWithNotes(false);
  }

  return {
    categoryFilter,
    setCategoryFilter,
    labelFilter,
    setLabelFilter,
    nameSearch,
    setNameSearch,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    onlyWithNotes,
    setOnlyWithNotes,
    clearFilters,
  };
}
