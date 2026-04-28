'use client';

import { useInvestmentsTableContext } from './InvestmentsTableContext';

export function YearBreakdown() {
  const { yearBreakdown, portfolioTotal } = useInvestmentsTableContext();

  if (yearBreakdown.length === 0) return null;

  return (
    <section aria-labelledby="totals-by-year-heading" className="mb-6">
      <h2 id="totals-by-year-heading" className="text-lg font-semibold mb-2">
        Totals by year
      </h2>
      <ul className="list-disc list-inside">
        {yearBreakdown.map(([year, total]) => {
          const percent =
            portfolioTotal > 0 ? (total / portfolioTotal) * 100 : 0;
          return (
            <li key={year}>{`${year}: $${total} (${percent.toFixed(1)}%)`}</li>
          );
        })}
      </ul>
    </section>
  );
}
