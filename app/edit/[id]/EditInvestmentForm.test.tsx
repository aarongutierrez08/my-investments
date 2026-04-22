import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditInvestmentForm } from './EditInvestmentForm';
import type { Investment } from '../../../lib/types';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const categories = [
  { id: 'cat-stocks', name: 'Stocks', color: '#3b82f6' },
  { id: 'cat-crypto', name: 'Crypto', color: '#f59e0b' },
];

const labels = [
  { id: 'lbl-longterm', name: 'long-term', color: '#059669' },
  { id: 'lbl-highrisk', name: 'high-risk', color: '#dc2626' },
];

const investment: Investment = {
  id: 'inv-001',
  instrument: 'AAPL',
  amount: 10,
  price: 150,
  purchaseDate: '2026-01-15',
  categoryId: 'cat-stocks',
  labelIds: ['lbl-longterm'],
  notes: 'Initial position',
};

describe('EditInvestmentForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('submits a PUT /api/investments/<id> request with the edited payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...investment, price: 175 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditInvestmentForm
        investment={investment}
        categories={categories}
        labels={labels}
      />,
    );

    const price = screen.getByLabelText(/price/i) as HTMLInputElement;
    fireEvent.change(price, { target: { value: '175' } });

    const submit = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/investments/inv-001',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
      }),
    );

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body).toEqual({
      instrument: 'AAPL',
      amount: 10,
      price: 175,
      purchaseDate: '2026-01-15',
      categoryId: 'cat-stocks',
      labelIds: ['lbl-longterm'],
      notes: 'Initial position',
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('shows an inline error message when the server returns an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'something broke' }), { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditInvestmentForm
        investment={investment}
        categories={categories}
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something broke/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
