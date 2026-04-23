'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Category, Investment, Label } from '../lib/types';
import { buildInvestmentsCsv } from '../lib/csv';

interface InvestmentsTableProps {
  investments: Investment[];
  labels: Label[];
}

type CategoryFilter = Category | '';
type SortDirection = 'asc' | 'desc' | null;
type NotesSortDirection = 'withFirst' | 'withoutFirst' | null;

function hasNotes(investment: Investment): boolean {
  return (investment.notes ?? '').trim() !== '';
}

const UNCATEGORIZED = 'Uncategorized';

export function InvestmentsTable({ investments, labels: labelsData }: InvestmentsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [nameSearch, setNameSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [onlyWithNotes, setOnlyWithNotes] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);
  const [nameSortDirection, setNameSortDirection] = useState<SortDirection>(null);
  const [categorySortDirection, setCategorySortDirection] = useState<SortDirection>(null);
  const [labelSortDirection, setLabelSortDirection] = useState<SortDirection>(null);
  const [notesSortDirection, setNotesSortDirection] = useState<NotesSortDirection>(null);

  const availableLabels = useMemo(() => {
    const unique = new Set<string>();
    for (const investment of investments) {
      for (const label of investment.labels ?? []) {
        unique.add(label);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [investments]);

  const availableCategories = useMemo(() => {
    const unique = new Set<Category>();
    for (const investment of investments) {
      if (investment.category) {
        unique.add(investment.category);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [investments]);

  const parseBound = (value: string): number | null => {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  };

  const minAmountBound = parseBound(minAmount);
  const maxAmountBound = parseBound(maxAmount);

  const filteredInvestments = useMemo(() => {
    const trimmedSearch = nameSearch.trim().toLowerCase();
    return investments.filter((investment) => {
      if (categoryFilter && investment.category !== categoryFilter) {
        return false;
      }
      if (labelFilter && !(investment.labels ?? []).includes(labelFilter)) {
        return false;
      }
      if (trimmedSearch) {
        const nameMatches = investment.instrument.toLowerCase().includes(trimmedSearch);
        const labelMatches = (investment.labels ?? []).some((label) =>
          label.toLowerCase().includes(trimmedSearch),
        );
        const notesMatches = (investment.notes ?? '')
          .toLowerCase()
          .includes(trimmedSearch);
        if (!nameMatches && !labelMatches && !notesMatches) {
          return false;
        }
      }
      if (fromDate || toDate) {
        const purchaseDate = investment.purchaseDate || '';
        if (!purchaseDate) return false;
        if (fromDate && purchaseDate < fromDate) return false;
        if (toDate && purchaseDate > toDate) return false;
      }
      if (minAmountBound !== null && investment.amount < minAmountBound) {
        return false;
      }
      if (maxAmountBound !== null && investment.amount > maxAmountBound) {
        return false;
      }
      if (onlyWithNotes && (investment.notes ?? '').trim() === '') {
        return false;
      }
      return true;
    });
  }, [
    investments,
    categoryFilter,
    labelFilter,
    nameSearch,
    fromDate,
    toDate,
    minAmountBound,
    maxAmountBound,
    onlyWithNotes,
  ]);

  const displayedInvestments = useMemo(() => {
    if (sortDirection !== null) {
      const sorted = [...filteredInvestments];
      sorted.sort((a, b) =>
        sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount,
      );
      return sorted;
    }
    if (dateSortDirection !== null) {
      const sorted = [...filteredInvestments];
      sorted.sort((a, b) => {
        const aDate = a.purchaseDate || '';
        const bDate = b.purchaseDate || '';
        if (aDate === bDate) return 0;
        if (dateSortDirection === 'asc') {
          if (aDate === '') return -1;
          if (bDate === '') return 1;
          return aDate < bDate ? -1 : 1;
        }
        if (aDate === '') return 1;
        if (bDate === '') return -1;
        return aDate < bDate ? 1 : -1;
      });
      return sorted;
    }
    if (nameSortDirection !== null) {
      const sorted = [...filteredInvestments];
      sorted.sort((a, b) => {
        const comparison = a.instrument.localeCompare(b.instrument, undefined, {
          sensitivity: 'base',
        });
        return nameSortDirection === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }
    if (categorySortDirection !== null) {
      const sorted = [...filteredInvestments];
      sorted.sort((a, b) => {
        const aCategory = (a.category as string | undefined) ?? '';
        const bCategory = (b.category as string | undefined) ?? '';
        if (aCategory === '' && bCategory === '') return 0;
        if (aCategory === '') return 1;
        if (bCategory === '') return -1;
        const comparison = aCategory.localeCompare(bCategory, undefined, {
          sensitivity: 'base',
        });
        return categorySortDirection === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }
    if (labelSortDirection !== null) {
      const firstLabel = (investment: Investment): string | null => {
        const labels = investment.labels ?? [];
        if (labels.length === 0) return null;
        return [...labels].sort((x, y) =>
          x.localeCompare(y, undefined, { sensitivity: 'base' }),
        )[0];
      };
      const sorted = [...filteredInvestments];
      sorted.sort((a, b) => {
        const aFirst = firstLabel(a);
        const bFirst = firstLabel(b);
        if (aFirst === null && bFirst === null) return 0;
        if (aFirst === null) return 1;
        if (bFirst === null) return -1;
        const comparison = aFirst.localeCompare(bFirst, undefined, {
          sensitivity: 'base',
        });
        return labelSortDirection === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }
    if (notesSortDirection !== null) {
      const sorted = [...filteredInvestments];
      sorted.sort((a, b) => {
        const aHas = hasNotes(a);
        const bHas = hasNotes(b);
        if (aHas !== bHas) {
          if (notesSortDirection === 'withFirst') {
            return aHas ? -1 : 1;
          }
          return aHas ? 1 : -1;
        }
        return b.amount - a.amount;
      });
      return sorted;
    }
    return filteredInvestments;
  }, [
    filteredInvestments,
    sortDirection,
    dateSortDirection,
    nameSortDirection,
    categorySortDirection,
    labelSortDirection,
    notesSortDirection,
  ]);

  function cycleSortDirection() {
    setDateSortDirection(null);
    setNameSortDirection(null);
    setCategorySortDirection(null);
    setLabelSortDirection(null);
    setNotesSortDirection(null);
    setSortDirection((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }

  function cycleDateSortDirection() {
    setSortDirection(null);
    setNameSortDirection(null);
    setCategorySortDirection(null);
    setLabelSortDirection(null);
    setNotesSortDirection(null);
    setDateSortDirection((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }

  function cycleNameSortDirection() {
    setSortDirection(null);
    setDateSortDirection(null);
    setCategorySortDirection(null);
    setLabelSortDirection(null);
    setNotesSortDirection(null);
    setNameSortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }

  function cycleCategorySortDirection() {
    setSortDirection(null);
    setDateSortDirection(null);
    setNameSortDirection(null);
    setLabelSortDirection(null);
    setNotesSortDirection(null);
    setCategorySortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }

  function cycleLabelSortDirection() {
    setSortDirection(null);
    setDateSortDirection(null);
    setNameSortDirection(null);
    setCategorySortDirection(null);
    setNotesSortDirection(null);
    setLabelSortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }

  function cycleNotesSortDirection() {
    setSortDirection(null);
    setDateSortDirection(null);
    setNameSortDirection(null);
    setCategorySortDirection(null);
    setLabelSortDirection(null);
    setNotesSortDirection((prev) => {
      if (prev === null) return 'withFirst';
      if (prev === 'withFirst') return 'withoutFirst';
      return null;
    });
  }

  const totalInvested = filteredInvestments.reduce(
    (sum, investment) => sum + investment.amount,
    0,
  );

  const hasActiveFilters =
    categoryFilter !== '' ||
    labelFilter !== '' ||
    nameSearch !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    onlyWithNotes;

  const isFiltered =
    categoryFilter !== '' ||
    labelFilter !== '' ||
    nameSearch.trim() !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    minAmountBound !== null ||
    maxAmountBound !== null ||
    onlyWithNotes;

  const totalInvestedLabel = isFiltered ? 'Total invested (filtered)' : 'Total invested';

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

  const filteredCount = filteredInvestments.length;
  const countLabel = `Showing ${filteredCount} ${filteredCount === 1 ? 'investment' : 'investments'}`;

  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    for (const investment of filteredInvestments) {
      const key = (investment.category as string | undefined) || UNCATEGORIZED;
      breakdown.set(key, (breakdown.get(key) ?? 0) + investment.amount);
    }
    return breakdown;
  }, [filteredInvestments]);

  const labelBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    for (const investment of filteredInvestments) {
      for (const label of investment.labels ?? []) {
        breakdown.set(label, (breakdown.get(label) ?? 0) + investment.amount);
      }
    }
    return new Map(
      Array.from(breakdown.entries()).sort(([a], [b]) => a.localeCompare(b)),
    );
  }, [filteredInvestments]);

  const yearBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    for (const investment of filteredInvestments) {
      const purchaseDate = investment.purchaseDate || '';
      if (!purchaseDate) continue;
      const year = purchaseDate.slice(0, 4);
      if (year.length !== 4) continue;
      breakdown.set(year, (breakdown.get(year) ?? 0) + investment.amount);
    }
    return Array.from(breakdown.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredInvestments]);

  function handleExportCsv() {
    const csv = buildInvestmentsCsv(displayedInvestments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'investments.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this investment?')) {
      return;
    }

    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/investments/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError('Failed to delete investment.');
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('Failed to delete investment.');
    } finally {
      setDeletingId(null);
    }
  }

  if (investments.length === 0) {
    return (
      <>
        <p className="mb-1 text-sm text-gray-600">{countLabel}</p>
        <p className="mb-4 text-lg font-semibold">
          {totalInvestedLabel}: ${totalInvested}
        </p>
        <p className="text-center text-gray-500">No investments yet. Add your first one.</p>
      </>
    );
  }

  return (
    <>
      {error && (
        <div role="alert" className="bg-red-100 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}
      <p className="mb-1 text-sm text-gray-600">{countLabel}</p>
      <p className="mb-4 text-lg font-semibold">
        {totalInvestedLabel}: ${totalInvested}
      </p>
      {categoryBreakdown.size > 0 && (
        <section aria-labelledby="total-by-category-heading" className="mb-6">
          <h2 id="total-by-category-heading" className="text-lg font-semibold mb-2">
            Total by category
          </h2>
          <ul className="list-disc list-inside">
            {Array.from(categoryBreakdown.entries()).map(([name, total]) => {
              const suffix =
                totalInvested > 0
                  ? ` (${Math.round((total / totalInvested) * 100)}%)`
                  : '';
              return <li key={name}>{`${name}: $${total}${suffix}`}</li>;
            })}
          </ul>
        </section>
      )}
      {labelBreakdown.size > 0 && (
        <section aria-labelledby="totals-by-label-heading" className="mb-6">
          <h2 id="totals-by-label-heading" className="text-lg font-semibold mb-2">
            Totals by label
          </h2>
          <ul className="list-disc list-inside">
            {Array.from(labelBreakdown.entries()).map(([name, total]) => (
              <li key={name}>{`${name}: $${total}`}</li>
            ))}
          </ul>
        </section>
      )}
      {yearBreakdown.length > 0 && (
        <section aria-labelledby="totals-by-year-heading" className="mb-6">
          <h2 id="totals-by-year-heading" className="text-lg font-semibold mb-2">
            Totals by year
          </h2>
          <ul className="list-disc list-inside">
            {yearBreakdown.map(([year, total]) => (
              <li key={year}>{`${year}: $${total}`}</li>
            ))}
          </ul>
        </section>
      )}
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label htmlFor="name-search" className="block text-sm font-medium mb-1">
            Search by name
          </label>
          <input
            id="name-search"
            type="text"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder="Search by name, label or notes"
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium mb-1">
            Filter by category
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="label-filter" className="block text-sm font-medium mb-1">
            Filter by label
          </label>
          <select
            id="label-filter"
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All labels</option>
            {availableLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from-date" className="block text-sm font-medium mb-1">
            From
          </label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="to-date" className="block text-sm font-medium mb-1">
            To
          </label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="min-amount" className="block text-sm font-medium mb-1">
            Min amount
          </label>
          <input
            id="min-amount"
            type="number"
            min="0"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="max-amount" className="block text-sm font-medium mb-1">
            Max amount
          </label>
          <input
            id="max-amount"
            type="number"
            min="0"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <label htmlFor="only-with-notes" className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              id="only-with-notes"
              type="checkbox"
              checked={onlyWithNotes}
              onChange={(event) => setOnlyWithNotes(event.target.checked)}
              className="h-4 w-4"
            />
            Only with notes
          </label>
        </div>
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold px-3 py-2 rounded"
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded"
          >
            Export CSV
          </button>
        </div>
      </div>
      {filteredInvestments.length === 0 ? (
        <p className="text-center text-gray-500">No investments in this category.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th
                className="py-3 px-4 text-left"
                aria-sort={
                  nameSortDirection === 'asc'
                    ? 'ascending'
                    : nameSortDirection === 'desc'
                      ? 'descending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={cycleNameSortDirection}
                  aria-label="Sort by name"
                  className="inline-flex items-center gap-1"
                >
                  Instrument
                  <span aria-hidden="true">
                    {nameSortDirection === 'asc' && '↑'}
                    {nameSortDirection === 'desc' && '↓'}
                    {nameSortDirection === null && '⇅'}
                  </span>
                </button>
              </th>
              <th
                className="py-3 px-4 text-left"
                aria-sort={
                  categorySortDirection === 'asc'
                    ? 'ascending'
                    : categorySortDirection === 'desc'
                      ? 'descending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={cycleCategorySortDirection}
                  aria-label="Sort by category"
                  className="inline-flex items-center gap-1"
                >
                  Category
                  <span aria-hidden="true">
                    {categorySortDirection === 'asc' && '↑'}
                    {categorySortDirection === 'desc' && '↓'}
                    {categorySortDirection === null && '⇅'}
                  </span>
                </button>
              </th>
              <th
                className="py-3 px-4 text-left"
                aria-sort={
                  sortDirection === 'asc'
                    ? 'ascending'
                    : sortDirection === 'desc'
                      ? 'descending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={cycleSortDirection}
                  aria-label="Sort by amount"
                  className="inline-flex items-center gap-1"
                >
                  Amount
                  <span aria-hidden="true">
                    {sortDirection === 'desc' && '↓'}
                    {sortDirection === 'asc' && '↑'}
                    {sortDirection === null && '⇅'}
                  </span>
                </button>
              </th>
              <th className="py-3 px-4 text-left">Price</th>
              <th
                className="py-3 px-4 text-left"
                aria-sort={
                  dateSortDirection === 'asc'
                    ? 'ascending'
                    : dateSortDirection === 'desc'
                      ? 'descending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={cycleDateSortDirection}
                  aria-label="Sort by date"
                  className="inline-flex items-center gap-1"
                >
                  Purchase date
                  <span aria-hidden="true">
                    {dateSortDirection === 'desc' && '↓'}
                    {dateSortDirection === 'asc' && '↑'}
                    {dateSortDirection === null && '⇅'}
                  </span>
                </button>
              </th>
              <th
                className="py-3 px-4 text-left"
                aria-sort={
                  labelSortDirection === 'asc'
                    ? 'ascending'
                    : labelSortDirection === 'desc'
                      ? 'descending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={cycleLabelSortDirection}
                  aria-label="Sort by label"
                  className="inline-flex items-center gap-1"
                >
                  Labels
                  <span aria-hidden="true">
                    {labelSortDirection === 'asc' && '↑'}
                    {labelSortDirection === 'desc' && '↓'}
                    {labelSortDirection === null && '⇅'}
                  </span>
                </button>
              </th>
              <th className="py-3 px-4 text-left">Total invested</th>
              <th
                className="py-3 px-4 text-left"
                aria-sort={
                  notesSortDirection === 'withFirst'
                    ? 'descending'
                    : notesSortDirection === 'withoutFirst'
                      ? 'ascending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={cycleNotesSortDirection}
                  aria-label="Sort by notes"
                  className="inline-flex items-center gap-1"
                >
                  Notes
                  <span aria-hidden="true">
                    {notesSortDirection === 'withFirst' && '↓'}
                    {notesSortDirection === 'withoutFirst' && '↑'}
                    {notesSortDirection === null && '⇅'}
                  </span>
                </button>
              </th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {displayedInvestments.map((investment) => {
              const labels = investment.labelIds
                .map((labelId) => labelsData.find((lbl) => lbl.id === labelId))
                .filter((l): l is Label => l !== undefined);

              const totalInvested = (investment.amount * investment.price).toFixed(2);

              const customLabels = investment.labels ?? [];

              return (
                <tr key={investment.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{investment.instrument}</span>
                      {customLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">{investment.category}</td>
                  <td className="py-3 px-4">{investment.amount}</td>
                  <td className="py-3 px-4">{investment.price.toFixed(2)}</td>
                  <td className="py-3 px-4">{investment.purchaseDate || '—'}</td>
                  <td className="py-3 px-4">
                    {labels.map((label) => (
                      <span
                        key={label.id}
                        className="inline-block bg-blue-200 text-blue-800 text-xs px-2 rounded-full mr-1"
                        style={{ backgroundColor: label.color, color: 'white' }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4">{totalInvested}</td>
                  <td
                    className="py-3 px-4 truncate max-w-xs"
                    title={investment.notes ? investment.notes : undefined}
                  >
                    {investment.notes ?? ''}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/edit/${investment.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(investment.id)}
                        disabled={isPending || deletingId === investment.id}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}
