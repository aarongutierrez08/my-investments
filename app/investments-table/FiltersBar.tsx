'use client';

import { buildInvestmentsCsv } from '../../lib/csv';
import { useInvestmentsTableContext } from './InvestmentsTableContext';
import type { CategoryFilter } from './types';

export function FiltersBar() {
  const {
    availableCategories,
    availableLabels,
    filters,
    hasActiveFilters,
    displayedInvestments,
  } = useInvestmentsTableContext();

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

  return (
    <div className="mb-4 flex flex-wrap gap-4">
      <div>
        <label htmlFor="name-search" className="block text-sm font-medium mb-1">
          Search by name
        </label>
        <input
          id="name-search"
          type="text"
          value={filters.nameSearch}
          onChange={(event) => filters.setNameSearch(event.target.value)}
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
          value={filters.categoryFilter}
          onChange={(event) =>
            filters.setCategoryFilter(event.target.value as CategoryFilter)
          }
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
          value={filters.labelFilter}
          onChange={(event) => filters.setLabelFilter(event.target.value)}
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
          value={filters.fromDate}
          onChange={(event) => filters.setFromDate(event.target.value)}
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
          value={filters.toDate}
          onChange={(event) => filters.setToDate(event.target.value)}
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
          value={filters.minAmount}
          onChange={(event) => filters.setMinAmount(event.target.value)}
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
          value={filters.maxAmount}
          onChange={(event) => filters.setMaxAmount(event.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div className="flex items-end">
        <label
          htmlFor="only-with-notes"
          className="inline-flex items-center gap-2 text-sm font-medium"
        >
          <input
            id="only-with-notes"
            type="checkbox"
            checked={filters.onlyWithNotes}
            onChange={(event) => filters.setOnlyWithNotes(event.target.checked)}
            className="h-4 w-4"
          />
          Only with notes
        </label>
      </div>
      {hasActiveFilters && (
        <div className="flex items-end">
          <button
            type="button"
            onClick={filters.clearFilters}
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
  );
}
