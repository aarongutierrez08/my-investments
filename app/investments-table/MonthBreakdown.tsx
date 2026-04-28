'use client';

import { useInvestmentsTableContext } from './InvestmentsTableContext';

export function MonthBreakdown() {
  const { monthBreakdown } = useInvestmentsTableContext();

  if (monthBreakdown.length === 0) return null;

  return (
    <section aria-labelledby="totals-by-month-heading" className="mb-6">
      <h2 id="totals-by-month-heading" className="text-lg font-semibold mb-2">
        Total invested per month
      </h2>
      <ul className="list-disc list-inside">
        {monthBreakdown.map(([month, total]) => (
          <li key={month}>{`${month}: $${total}`}</li>
        ))}
      </ul>
    </section>
  );
}
