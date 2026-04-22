import Link from 'next/link';
import { storage } from '../lib/storage';
import { InvestmentsTable } from './InvestmentsTable';
import type { Investment } from '../lib/types';

const UNCATEGORIZED = 'Uncategorized';

function computeCategoryBreakdown(investments: Investment[]): Map<string, number> {
  const breakdown = new Map<string, number>();
  for (const investment of investments) {
    const key = (investment.category as string | undefined) || UNCATEGORIZED;
    breakdown.set(key, (breakdown.get(key) ?? 0) + investment.amount);
  }
  return breakdown;
}

export default async function HomePage() {
  const { investments, labels } = await storage.readAll();

  const breakdown = computeCategoryBreakdown(investments);

  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <Link
          href="/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
        >
          Add investment
        </Link>
      </div>

      {breakdown.size > 0 && (
        <section aria-labelledby="total-by-category-heading" className="mb-6">
          <h2 id="total-by-category-heading" className="text-lg font-semibold mb-2">
            Total by category
          </h2>
          <ul className="list-disc list-inside">
            {Array.from(breakdown.entries()).map(([name, total]) => (
              <li key={name}>
                {name}: ${total}
              </li>
            ))}
          </ul>
        </section>
      )}

      <InvestmentsTable investments={investments} labels={labels} />
    </main>
  );
}
