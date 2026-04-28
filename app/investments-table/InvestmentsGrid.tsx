'use client';

import Link from 'next/link';
import type { Investment, Label } from '../../lib/types';
import { useInvestmentsTableContext } from './InvestmentsTableContext';
import type { NotesSortDirection, SortDirection } from './types';

type AriaSort = 'ascending' | 'descending' | 'none';

function ariaSort(direction: SortDirection): AriaSort {
  if (direction === 'asc') return 'ascending';
  if (direction === 'desc') return 'descending';
  return 'none';
}

function notesAriaSort(direction: NotesSortDirection): AriaSort {
  if (direction === 'withFirst') return 'descending';
  if (direction === 'withoutFirst') return 'ascending';
  return 'none';
}

function arrowFor(direction: SortDirection): string {
  if (direction === 'asc') return '↑';
  if (direction === 'desc') return '↓';
  return '⇅';
}

function notesArrow(direction: NotesSortDirection): string {
  if (direction === 'withFirst') return '↓';
  if (direction === 'withoutFirst') return '↑';
  return '⇅';
}

export function InvestmentsGrid() {
  const { sort, displayedInvestments, labelsData, delete: deleteState } =
    useInvestmentsTableContext();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th
              className="py-3 px-4 text-left"
              aria-sort={ariaSort(sort.nameSortDirection)}
            >
              <button
                type="button"
                onClick={sort.cycleNameSortDirection}
                aria-label="Sort by name"
                className="inline-flex items-center gap-1"
              >
                Instrument
                <span aria-hidden="true">{arrowFor(sort.nameSortDirection)}</span>
              </button>
            </th>
            <th
              className="py-3 px-4 text-left"
              aria-sort={ariaSort(sort.categorySortDirection)}
            >
              <button
                type="button"
                onClick={sort.cycleCategorySortDirection}
                aria-label="Sort by category"
                className="inline-flex items-center gap-1"
              >
                Category
                <span aria-hidden="true">{arrowFor(sort.categorySortDirection)}</span>
              </button>
            </th>
            <th
              className="py-3 px-4 text-left"
              aria-sort={ariaSort(sort.sortDirection)}
            >
              <button
                type="button"
                onClick={sort.cycleSortDirection}
                aria-label="Sort by amount"
                className="inline-flex items-center gap-1"
              >
                Amount
                <span aria-hidden="true">{arrowFor(sort.sortDirection)}</span>
              </button>
            </th>
            <th className="py-3 px-4 text-left">Price</th>
            <th
              className="py-3 px-4 text-left"
              aria-sort={ariaSort(sort.dateSortDirection)}
            >
              <button
                type="button"
                onClick={sort.cycleDateSortDirection}
                aria-label="Sort by date"
                className="inline-flex items-center gap-1"
              >
                Purchase date
                <span aria-hidden="true">{arrowFor(sort.dateSortDirection)}</span>
              </button>
            </th>
            <th
              className="py-3 px-4 text-left"
              aria-sort={ariaSort(sort.labelSortDirection)}
            >
              <button
                type="button"
                onClick={sort.cycleLabelSortDirection}
                aria-label="Sort by label"
                className="inline-flex items-center gap-1"
              >
                Labels
                <span aria-hidden="true">{arrowFor(sort.labelSortDirection)}</span>
              </button>
            </th>
            <th className="py-3 px-4 text-left">Total invested</th>
            <th
              className="py-3 px-4 text-left"
              aria-sort={notesAriaSort(sort.notesSortDirection)}
            >
              <button
                type="button"
                onClick={sort.cycleNotesSortDirection}
                aria-label="Sort by notes"
                className="inline-flex items-center gap-1"
              >
                Notes
                <span aria-hidden="true">{notesArrow(sort.notesSortDirection)}</span>
              </button>
            </th>
            <th className="py-3 px-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {displayedInvestments.map((investment) => (
            <InvestmentRow
              key={investment.id}
              investment={investment}
              labels={labelsData}
              isPending={deleteState.isPending}
              deletingId={deleteState.deletingId}
              onDelete={deleteState.handleDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InvestmentRowProps {
  investment: Investment;
  labels: Label[];
  isPending: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
}

function InvestmentRow({
  investment,
  labels,
  isPending,
  deletingId,
  onDelete,
}: InvestmentRowProps) {
  const linkedLabels = investment.labelIds
    .map((labelId) => labels.find((lbl) => lbl.id === labelId))
    .filter((label): label is Label => label !== undefined);

  const totalInvested = (investment.amount * investment.price).toFixed(2);
  const customLabels = investment.labels ?? [];

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-100">
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
        {linkedLabels.map((label) => (
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
            onClick={() => onDelete(investment.id)}
            disabled={isPending || deletingId === investment.id}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold px-3 py-1 rounded"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
