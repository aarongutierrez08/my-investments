'use client';

import type { Investment, Label } from '../lib/types';
import { CategoryBreakdown } from './investments-table/CategoryBreakdown';
import { FiltersBar } from './investments-table/FiltersBar';
import {
  InvestmentsTableProvider,
  useInvestmentsTableContext,
} from './investments-table/InvestmentsTableContext';
import { InvestmentsGrid } from './investments-table/InvestmentsGrid';
import { LabelBreakdown } from './investments-table/LabelBreakdown';
import { MonthBreakdown } from './investments-table/MonthBreakdown';
import { SummaryStats } from './investments-table/SummaryStats';
import { YearBreakdown } from './investments-table/YearBreakdown';

interface InvestmentsTableProps {
  investments: Investment[];
  labels: Label[];
}

export function InvestmentsTable({ investments, labels }: InvestmentsTableProps) {
  return (
    <InvestmentsTableProvider investments={investments} labelsData={labels}>
      <InvestmentsTableContent />
    </InvestmentsTableProvider>
  );
}

function InvestmentsTableContent() {
  const { investments, filteredInvestments, delete: deleteState } =
    useInvestmentsTableContext();

  if (investments.length === 0) {
    return (
      <>
        <SummaryStats />
        <p className="text-center text-gray-500">
          No investments yet. Add your first one.
        </p>
      </>
    );
  }

  return (
    <>
      {deleteState.error && (
        <div role="alert" className="bg-red-100 text-red-800 p-3 rounded mb-4">
          {deleteState.error}
        </div>
      )}
      <SummaryStats />
      <CategoryBreakdown />
      <LabelBreakdown />
      <YearBreakdown />
      <MonthBreakdown />
      <FiltersBar />
      {filteredInvestments.length === 0 ? (
        <p className="text-center text-gray-500">No investments in this category.</p>
      ) : (
        <InvestmentsGrid />
      )}
    </>
  );
}
