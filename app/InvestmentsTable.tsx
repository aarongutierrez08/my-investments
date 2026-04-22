'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, type Category, type Investment, type Label } from '../lib/types';

interface InvestmentsTableProps {
  investments: Investment[];
  labels: Label[];
}

type CategoryFilter = Category | '';
type SortDirection = 'asc' | 'desc' | null;

export function InvestmentsTable({ investments, labels: labelsData }: InvestmentsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [nameSearch, setNameSearch] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const availableLabels = useMemo(() => {
    const unique = new Set<string>();
    for (const investment of investments) {
      for (const label of investment.labels ?? []) {
        unique.add(label);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [investments]);

  const filteredInvestments = useMemo(() => {
    const trimmedSearch = nameSearch.trim().toLowerCase();
    return investments.filter((investment) => {
      if (categoryFilter && investment.category !== categoryFilter) {
        return false;
      }
      if (labelFilter && !(investment.labels ?? []).includes(labelFilter)) {
        return false;
      }
      if (trimmedSearch && !investment.instrument.toLowerCase().includes(trimmedSearch)) {
        return false;
      }
      return true;
    });
  }, [investments, categoryFilter, labelFilter, nameSearch]);

  const displayedInvestments = useMemo(() => {
    if (sortDirection === null) {
      return filteredInvestments;
    }
    const sorted = [...filteredInvestments];
    sorted.sort((a, b) =>
      sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount,
    );
    return sorted;
  }, [filteredInvestments, sortDirection]);

  function cycleSortDirection() {
    setSortDirection((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }

  const totalInvested = filteredInvestments.reduce(
    (sum, investment) => sum + investment.amount,
    0,
  );

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
        <p className="mb-4 text-lg font-semibold">Total invested: ${totalInvested}</p>
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
      <p className="mb-4 text-lg font-semibold">Total invested: ${totalInvested}</p>
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
            placeholder="Search by name..."
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
            {CATEGORIES.map((category) => (
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
      </div>
      {filteredInvestments.length === 0 ? (
        <p className="text-center text-gray-500">No investments in this category.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-4 text-left">Instrument</th>
              <th className="py-3 px-4 text-left">Category</th>
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
              <th className="py-3 px-4 text-left">Purchase date</th>
              <th className="py-3 px-4 text-left">Labels</th>
              <th className="py-3 px-4 text-left">Total invested</th>
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
                  <td className="py-3 px-4">{investment.purchaseDate}</td>
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
