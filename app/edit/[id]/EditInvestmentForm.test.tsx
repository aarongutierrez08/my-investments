import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditInvestmentForm } from './EditInvestmentForm';
import { CATEGORIES, type Investment } from '../../../lib/types';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

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
  category: 'Stocks',
  labelIds: ['lbl-longterm'],
  labels: [],
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

  it('pre-selects the investment current category', () => {
    render(<EditInvestmentForm investment={investment} labels={labels} />);

    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(category.value).toBe('Stocks');
  });

  it('renders the same predefined categories offered by the create form', () => {
    render(<EditInvestmentForm investment={investment} labels={labels} />);

    for (const category of CATEGORIES) {
      expect(screen.getByRole('option', { name: category })).toBeInTheDocument();
    }
  });

  it('pre-fills the purchase date input with the investment current value', () => {
    render(<EditInvestmentForm investment={investment} labels={labels} />);

    const purchaseDate = screen.getByLabelText(/purchase date/i) as HTMLInputElement;
    expect(purchaseDate.value).toBe('2026-01-15');
  });

  it('sends the new purchase date when changed and submitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...investment, purchaseDate: '2024-06-30' }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<EditInvestmentForm investment={investment} labels={labels} />);

    fireEvent.change(screen.getByLabelText(/purchase date/i), {
      target: { value: '2024-06-30' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.purchaseDate).toBe('2024-06-30');
  });

  it('submits a PUT /api/investments/<id> request with the edited payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...investment, price: 175 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<EditInvestmentForm investment={investment} labels={labels} />);

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
      category: 'Stocks',
      labelIds: ['lbl-longterm'],
      labels: [],
      notes: 'Initial position',
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('sends the new category when changed and submitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...investment, category: 'Crypto' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<EditInvestmentForm investment={investment} labels={labels} />);

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Crypto' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.category).toBe('Crypto');
  });

  describe('custom labels (free-text chips)', () => {
    function getLabelsInput(): HTMLInputElement {
      return screen.getByPlaceholderText(/add a label/i) as HTMLInputElement;
    }

    const investmentWithLabels: Investment = {
      ...investment,
      labels: ['crypto', 'long-term'],
    };

    it('renders the investment current labels as chips and submits without the removed one', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(investmentWithLabels), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);

      render(<EditInvestmentForm investment={investmentWithLabels} labels={labels} />);

      expect(screen.getByRole('button', { name: /remove crypto/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove long-term/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /remove long-term/i }));
      expect(
        screen.queryByRole('button', { name: /remove long-term/i }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.labels).toEqual(['crypto']);
    });

    it('submits a payload that includes a newly-typed label', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(investmentWithLabels), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);

      render(<EditInvestmentForm investment={investmentWithLabels} labels={labels} />);

      const input = getLabelsInput();
      fireEvent.change(input, { target: { value: 'speculative' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.labels).toEqual(['crypto', 'long-term', 'speculative']);
    });
  });

  describe('notes', () => {
    it('pre-fills the notes textarea with the investment current notes', () => {
      render(<EditInvestmentForm investment={investment} labels={labels} />);

      const notes = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
      expect(notes.value).toBe('Initial position');
    });

    it('renders an empty textarea when the investment has no notes', () => {
      const withoutNotes: Investment = { ...investment, notes: undefined };
      render(<EditInvestmentForm investment={withoutNotes} labels={labels} />);

      const notes = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
      expect(notes.value).toBe('');
    });

    it('sends the edited notes in the PUT body when changed and submitted', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...investment, notes: 'Revised thesis' }), {
          status: 200,
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      render(<EditInvestmentForm investment={investment} labels={labels} />);

      fireEvent.change(screen.getByLabelText(/notes/i), {
        target: { value: 'Revised thesis' },
      });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.notes).toBe('Revised thesis');
    });

    it('sends an empty notes value when the textarea is cleared and submitted', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...investment, notes: undefined }), {
          status: 200,
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      render(<EditInvestmentForm investment={investment} labels={labels} />);

      fireEvent.change(screen.getByLabelText(/notes/i), {
        target: { value: '' },
      });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body).toHaveProperty('notes');
      expect(body.notes).toBe('');
    });
  });

  it('shows an inline error message when the server returns an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'something broke' }), { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<EditInvestmentForm investment={investment} labels={labels} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something broke/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
