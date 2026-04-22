'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Category, Label } from '../../lib/types';

interface AddInvestmentFormProps {
  categories: Category[];
  labels: Label[];
  defaultDate: string;
}

export function AddInvestmentForm({
  categories,
  labels,
  defaultDate,
}: AddInvestmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const labelIds = formData.getAll('labelIds').map(String);
    const notes = String(formData.get('notes') ?? '').trim();

    const payload = {
      instrument: String(formData.get('instrument') ?? '').trim(),
      amount: Number(formData.get('amount')),
      price: Number(formData.get('price')),
      purchaseDate: String(formData.get('purchaseDate') ?? ''),
      categoryId: String(formData.get('categoryId') ?? ''),
      labelIds,
      ...(notes && { notes }),
    };

    startTransition(async () => {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to save investment' }));
        setError(body.error ?? 'Failed to save investment');
        return;
      }

      router.push('/');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-xl">
      {error && (
        <div role="alert" className="bg-red-100 text-red-800 p-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="instrument" className="block text-sm font-medium mb-1">
          Instrument
        </label>
        <input
          id="instrument"
          name="instrument"
          type="text"
          required
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="any"
          min="0"
          required
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-1">
          Price
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="any"
          min="0"
          required
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="purchaseDate" className="block text-sm font-medium mb-1">
          Purchase date
        </label>
        <input
          id="purchaseDate"
          name="purchaseDate"
          type="date"
          required
          defaultValue={defaultDate}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue=""
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              ● {category.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium mb-1">Labels</legend>
        <div className="space-y-1">
          {labels.length === 0 && (
            <p className="text-sm text-gray-500">No labels available.</p>
          )}
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2">
              <input
                id={`label-${label.id}`}
                name="labelIds"
                type="checkbox"
                value={label.id}
              />
              <label htmlFor={`label-${label.id}`} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2 rounded"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <Link href="/" className="text-blue-600 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
