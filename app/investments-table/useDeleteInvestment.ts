import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface DeleteState {
  error: string | null;
  deletingId: string | null;
  isPending: boolean;
  handleDelete: (id: string) => Promise<void>;
}

export function useDeleteInvestment(): DeleteState {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this investment?')) {
      return;
    }

    setError(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/investments/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError('Failed to delete investment.');
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('Failed to delete investment.');
    } finally {
      setDeletingId(null);
    }
  }

  return { error, deletingId, isPending, handleDelete };
}
