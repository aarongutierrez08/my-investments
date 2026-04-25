import { notFound } from 'next/navigation';
import { storage } from '../../../lib/storage';
import { getInvestment } from '../../../lib/investments/storage';
import { EditInvestmentForm } from './EditInvestmentForm';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPage({ params }: EditPageProps) {
  const { id } = await params;
  const [investment, { labels }] = await Promise.all([
    getInvestment(id),
    storage.readAll(),
  ]);

  if (!investment) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Edit investment</h1>
      <EditInvestmentForm investment={investment} labels={labels} />
    </main>
  );
}
