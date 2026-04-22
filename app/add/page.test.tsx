import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddPage from './page';
import { storage } from '../../lib/storage';

vi.mock('../../lib/storage', () => ({
  storage: {
    readAll: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const today = new Date().toISOString().slice(0, 10);

describe('AddPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.readAll as unknown as vi.Mock).mockResolvedValue({
      investments: [],
      categories: [
        { id: 'cat-stocks', name: 'Stocks', color: '#3b82f6' },
        { id: 'cat-crypto', name: 'Crypto', color: '#f59e0b' },
      ],
      labels: [
        { id: 'lbl-longterm', name: 'long-term', color: '#059669' },
        { id: 'lbl-highrisk', name: 'high-risk', color: '#dc2626' },
      ],
    });
  });

  it('renders all form inputs with proper labels', async () => {
    const Resolved = await AddPage();
    render(Resolved);

    const instrument = screen.getByLabelText(/instrument/i) as HTMLInputElement;
    expect(instrument).toBeInTheDocument();
    expect(instrument.tagName).toBe('INPUT');
    expect(instrument).toBeRequired();

    const amount = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amount).toBeInTheDocument();
    expect(amount.type).toBe('number');
    expect(amount).toBeRequired();

    const price = screen.getByLabelText(/price/i) as HTMLInputElement;
    expect(price).toBeInTheDocument();
    expect(price.type).toBe('number');
    expect(price).toBeRequired();

    const purchaseDate = screen.getByLabelText(/purchase date/i) as HTMLInputElement;
    expect(purchaseDate).toBeInTheDocument();
    expect(purchaseDate.type).toBe('date');
    expect(purchaseDate).toBeRequired();
    expect(purchaseDate.defaultValue).toBe(today);

    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(category).toBeInTheDocument();
    expect(category.tagName).toBe('SELECT');
    expect(category).toBeRequired();

    const notes = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
    expect(notes).toBeInTheDocument();
    expect(notes.tagName).toBe('TEXTAREA');
  });

  it('lists existing categories as options', async () => {
    const Resolved = await AddPage();
    render(Resolved);

    expect(screen.getByRole('option', { name: /Stocks/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Crypto/i })).toBeInTheDocument();
  });

  it('lists existing labels as checkboxes', async () => {
    const Resolved = await AddPage();
    render(Resolved);

    const longterm = screen.getByLabelText(/long-term/i) as HTMLInputElement;
    expect(longterm).toBeInTheDocument();
    expect(longterm.type).toBe('checkbox');

    const highrisk = screen.getByLabelText(/high-risk/i) as HTMLInputElement;
    expect(highrisk).toBeInTheDocument();
    expect(highrisk.type).toBe('checkbox');
  });

  it('shows a Save submit button and a Cancel link back to /', async () => {
    const Resolved = await AddPage();
    render(Resolved);

    const save = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(save).toBeInTheDocument();
    expect(save.type).toBe('submit');

    const cancel = screen.getByRole('link', { name: /cancel/i }) as HTMLAnchorElement;
    expect(cancel).toBeInTheDocument();
    expect(cancel.getAttribute('href')).toBe('/');
  });
});
