'use client';

import { investmentCountSuffix } from './formatters';
import { useInvestmentsTableContext } from './InvestmentsTableContext';

export function LabelBreakdown() {
  const { labelBreakdown } = useInvestmentsTableContext();

  if (labelBreakdown.size === 0) return null;

  return (
    <section aria-labelledby="totals-by-label-heading" className="mb-6">
      <h2 id="totals-by-label-heading" className="text-lg font-semibold mb-2">
        Totals by label
      </h2>
      <ul className="list-disc list-inside">
        {Array.from(labelBreakdown.entries()).map(([name, { total, count }]) => (
          <li key={name}>{`${name}: $${total}${investmentCountSuffix(count)}`}</li>
        ))}
      </ul>
    </section>
  );
}
