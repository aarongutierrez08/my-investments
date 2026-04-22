'use client';

import { useState, useTransition, type FormEvent, type KeyboardEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, type Label } from '../../lib/types';

interface AddInvestmentFormProps {
  labels: Label[];
  defaultDate: string;
}

export function AddInvestmentForm({ labels, defaultDate }: AddInvestmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState('');

  function addLabel(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return;
    }
    setCustomLabels((current) =>
      current.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())
        ? current
        : [...current, trimmed],
    );
  }

  function handleLabelKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addLabel(labelDraft);
      setLabelDraft('');
    }
  }

  function handleLabelChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (value.endsWith(',')) {
      addLabel(value.slice(0, -1));
      setLabelDraft('');
      return;
    }
    setLabelDraft(value);
  }

  function removeLabel(label: string) {
    setCustomLabels((current) => current.filter((existing) => existing !== label));
  }

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

    const pendingLabel = labelDraft.trim();
    const submittedLabels = pendingLabel
      ? customLabels.some(
          (existing) => existing.toLowerCase() === pendingLabel.toLowerCase(),
        )
        ? customLabels
        : [...customLabels, pendingLabel]
      : customLabels;

    const payload = {
      instrument: String(formData.get('instrument') ?? '').trim(),
      amount: Number(formData.get('amount')),
      price: Number(formData.get('price')),
      purchaseDate: String(formData.get('purchaseDate') ?? ''),
      category,
      labelIds,
      labels: submittedLabels,
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
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
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

      <div>
        <label htmlFor="custom-labels" className="block text-sm font-medium mb-1">
          Labels
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {customLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
            >
              {label}
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={() => removeLabel(label)}
                className="text-blue-800 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          id="custom-labels"
          type="text"
          value={labelDraft}
          onChange={handleLabelChange}
          onKeyDown={handleLabelKeyDown}
          placeholder="Add a label and press Enter or comma"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium mb-1">Label presets</legend>
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
