'use client';

import { useInvestmentsTableContext } from './InvestmentsTableContext';

export function SummaryStats() {
  const {
    isFiltered,
    filteredCount,
    totalInvested,
    averageInvested,
    medianInvested,
    minInvested,
    maxInvested,
    stdDevInvested,
  } = useInvestmentsTableContext();

  const countLabel = `Showing ${filteredCount} ${filteredCount === 1 ? 'investment' : 'investments'}`;
  const totalInvestedLabel = isFiltered ? 'Total invested (filtered)' : 'Total invested';
  const averageLabel = isFiltered ? 'Average (filtered)' : 'Average';
  const medianLabel = isFiltered ? 'Median (filtered)' : 'Median';
  const minLabel = isFiltered ? 'Min purchase amount (filtered)' : 'Min purchase amount';
  const maxLabel = isFiltered ? 'Max purchase amount (filtered)' : 'Max purchase amount';
  const stdDevLabel = isFiltered ? 'Standard deviation (filtered)' : 'Standard deviation';

  return (
    <>
      <p className="mb-1 text-sm text-gray-600">{countLabel}</p>
      <p className="mb-4 text-lg font-semibold">
        {totalInvestedLabel}: ${totalInvested}
      </p>
      <p className="mb-4 text-lg font-semibold">
        {averageLabel}: ${averageInvested}
      </p>
      <p className="mb-4 text-lg font-semibold">
        {medianLabel}: ${medianInvested}
      </p>
      <p className="mb-4 text-lg font-semibold">
        {minLabel}: ${minInvested}
      </p>
      <p className="mb-4 text-lg font-semibold">
        {maxLabel}: ${maxInvested}
      </p>
      <p className="mb-4 text-lg font-semibold">
        {stdDevLabel}: ${stdDevInvested}
      </p>
    </>
  );
}
