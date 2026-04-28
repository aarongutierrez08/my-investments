'use client';

import { investmentCountSuffix } from './formatters';
import { useInvestmentsTableContext } from './InvestmentsTableContext';

export function CategoryBreakdown() {
  const { categoryBreakdown, totalInvested } = useInvestmentsTableContext();

  if (categoryBreakdown.size === 0) return null;

  return (
    <section aria-labelledby="total-by-category-heading" className="mb-6">
      <h2 id="total-by-category-heading" className="text-lg font-semibold mb-2">
        Total by category
      </h2>
      <ul className="list-disc list-inside">
        {Array.from(categoryBreakdown.entries()).map(([name, { total, count }]) => {
          const percentSuffix =
            totalInvested > 0
              ? ` (${Math.round((total / totalInvested) * 100)}%)`
              : '';
          return (
            <li key={name}>
              {`${name}: $${total}${percentSuffix}${investmentCountSuffix(count)}`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
