import { listLabels } from '../../lib/labels/storage';
import { AddInvestmentForm } from './AddInvestmentForm';

export default async function AddPage() {
  const labels = await listLabels();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Add investment</h1>
      <AddInvestmentForm labels={labels} defaultDate={today} />
    </main>
  );
}
