import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditPage from './page';
import { storage } from '../../../lib/storage';
import { getInvestment } from '../../../lib/investments/storage';

vi.mock('../../../lib/storage', () => ({
  storage: {
    readAll: vi.fn(),
  },
}));

vi.mock('../../../lib/investments/storage', () => ({
  getInvestment: vi.fn(),
}));

const notFoundError = new Error('NEXT_NOT_FOUND');

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockLabel = { id: 'lbl-longterm', name: 'long-term', color: '#059669' };
const mockInvestment = {
  id: 'inv-001',
  instrument: 'AAPL',
  amount: 10,
  price: 150,
  purchaseDate: '2026-01-15',
  category: 'Stocks',
  labelIds: [mockLabel.id],
  notes: 'Initial position',
};

describe('EditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.readAll as unknown as vi.Mock).mockResolvedValue({
      investments: [mockInvestment],
      labels: [mockLabel],
    });
    vi.mocked(getInvestment).mockImplementation(async (id: string) => {
      const result = await vi.mocked(storage.readAll)();
      return result.investments.find((inv) => inv.id === id) ?? null;
    });
  });

  it('renders the form pre-filled with the investment values when the id exists', async () => {
    const Resolved = await EditPage({ params: Promise.resolve({ id: 'inv-001' }) });
    render(Resolved);

    const instrument = screen.getByLabelText(/instrument/i) as HTMLInputElement;
    expect(instrument.defaultValue).toBe('AAPL');

    const amount = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amount.defaultValue).toBe('10');

    const price = screen.getByLabelText(/price/i) as HTMLInputElement;
    expect(price.defaultValue).toBe('150');

    const purchaseDate = screen.getByLabelText(/purchase date/i) as HTMLInputElement;
    expect(purchaseDate.defaultValue).toBe('2026-01-15');

    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(category.value).toBe('Stocks');

    const longterm = screen.getByLabelText(/long-term/i) as HTMLInputElement;
    expect(longterm.defaultChecked).toBe(true);

    const notes = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
    expect(notes.defaultValue).toBe('Initial position');
  });

  it('calls notFound() when the investment id does not exist', async () => {
    const { notFound } = await import('next/navigation');

    await expect(
      EditPage({ params: Promise.resolve({ id: 'missing' }) }),
    ).rejects.toBe(notFoundError);

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
