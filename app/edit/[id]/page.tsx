import { notFound } from 'next/navigation';
import { storage } from '../../../lib/storage';
import { EditInvestmentForm } from './EditInvestmentForm';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPage({ params }: EditPageProps) {
  const { id } = await params;
  const { investments, categories, labels } = await storage.readAll();
  const investment = investments.find((inv) => inv.id === id);

  if (!investment) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Edit investment</h1>
      <EditInvestmentForm
        investment={investment}
        categories={categories}
        labels={labels}
      />
    </main>
  );
}
