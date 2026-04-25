import Link from 'next/link';
import { storage } from '../lib/storage';
import { listInvestments } from '../lib/investments/storage';
import { InvestmentsTable } from './InvestmentsTable';

export default async function HomePage() {
  const [investments, { labels }] = await Promise.all([
    listInvestments(),
    storage.readAll(),
  ]);

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

      <InvestmentsTable investments={investments} labels={labels} />
    </main>
  );
}
