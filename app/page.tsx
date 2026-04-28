import Link from 'next/link';
import { listInvestments } from '../lib/investments/storage';
import { listLabels } from '../lib/labels/storage';
import { InvestmentsTable } from './InvestmentsTable';
import { SignOutButton } from './sign-out/SignOutButton';

export default async function HomePage() {
  const [investments, labels] = await Promise.all([
    listInvestments(),
    listLabels(),
  ]);

  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/add"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
          >
            Add investment
          </Link>
          <SignOutButton />
        </div>
      </div>

      <InvestmentsTable investments={investments} labels={labels} />
    </main>
  );
}
