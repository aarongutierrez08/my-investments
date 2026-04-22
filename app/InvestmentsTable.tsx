'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Investment, Label } from '../lib/types';

interface InvestmentsTableProps {
  investments: Investment[];
  labels: Label[];
}

export function InvestmentsTable({ investments, labels: labelsData }: InvestmentsTableProps) {
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

  return (
    <>
      {error && (
        <div role="alert" className="bg-red-100 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-4 text-left">Instrument</th>
              <th className="py-3 px-4 text-left">Category</th>
              <th className="py-3 px-4 text-left">Amount</th>
              <th className="py-3 px-4 text-left">Price</th>
              <th className="py-3 px-4 text-left">Purchase date</th>
              <th className="py-3 px-4 text-left">Labels</th>
              <th className="py-3 px-4 text-left">Total invested</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {investments.map((investment) => {
              const labels = investment.labelIds
                .map((labelId) => labelsData.find((lbl) => lbl.id === labelId))
                .filter((l): l is Label => l !== undefined);

              const totalInvested = (investment.amount * investment.price).toFixed(2);

              return (
                <tr key={investment.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-4">{investment.instrument}</td>
                  <td className="py-3 px-4">{investment.category}</td>
                  <td className="py-3 px-4">{investment.amount}</td>
                  <td className="py-3 px-4">{investment.price.toFixed(2)}</td>
                  <td className="py-3 px-4">{investment.purchaseDate}</td>
                  <td className="py-3 px-4">
                    {labels.map((label) => (
                      <span
                        key={label.id}
                        className="inline-block bg-blue-200 text-blue-800 text-xs px-2 rounded-full mr-1"
                        style={{ backgroundColor: label.color, color: 'white' }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4">{totalInvested}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/edit/${investment.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(investment.id)}
                        disabled={isPending || deletingId === investment.id}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
