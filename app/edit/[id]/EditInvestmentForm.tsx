'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, type Investment, type Label } from '../../../lib/types';

interface EditInvestmentFormProps {
  investment: Investment;
  labels: Label[];
}

export function EditInvestmentForm({ investment, labels }: EditInvestmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCategoryError(null);

    const formData = new FormData(event.currentTarget);
    const labelIds = formData.getAll('labelIds').map(String);
    const notes = String(formData.get('notes') ?? '').trim();
    const category = String(formData.get('category') ?? '');

    if (!category) {
      setCategoryError('Category is required');
      return;
    }

    const payload = {
      instrument: String(formData.get('instrument') ?? '').trim(),
      amount: Number(formData.get('amount')),
      price: Number(formData.get('price')),
      purchaseDate: String(formData.get('purchaseDate') ?? ''),
      category,
      labelIds,
      ...(notes && { notes }),
    };

    startTransition(async () => {
      const response = await fetch(`/api/investments/${investment.id}`, {
        method: 'PUT',
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
          defaultValue={investment.instrument}
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
          defaultValue={investment.amount}
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
          defaultValue={investment.price}
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
          defaultValue={investment.purchaseDate}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={investment.category}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="" disabled>
            -- Select a category --
          </option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {categoryError && (
          <p role="alert" className="text-sm text-red-700 mt-1">
            {categoryError}
          </p>
        )}
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
                defaultChecked={investment.labelIds.includes(label.id)}
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
          defaultValue={investment.notes ?? ''}
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
