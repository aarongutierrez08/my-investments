import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AddPage from './page';
import { storage } from '../../lib/storage';
import { CATEGORIES } from '../../lib/types';

vi.mock('../../lib/storage', () => ({
  storage: {
    readAll: vi.fn(),
  },
}));

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const today = new Date().toISOString().slice(0, 10);

describe('AddPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    refreshMock.mockClear();
    (storage.readAll as unknown as vi.Mock).mockResolvedValue({
      investments: [],
      labels: [
        { id: 'lbl-longterm', name: 'long-term', color: '#059669' },
        { id: 'lbl-highrisk', name: 'high-risk', color: '#dc2626' },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('renders all six predefined categories as options', async () => {
    const Resolved = await AddPage();
    render(Resolved);

    for (const category of CATEGORIES) {
      expect(screen.getByRole('option', { name: category })).toBeInTheDocument();
    }
  });

  it('shows a disabled placeholder selected by default', async () => {
    const Resolved = await AddPage();
    render(Resolved);

    const placeholder = screen.getByRole('option', {
      name: /select a category/i,
    }) as HTMLOptionElement;
    expect(placeholder).toBeInTheDocument();
    expect(placeholder.disabled).toBe(true);

    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(category.value).toBe('');
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

  it('shows a validation error when submitted without selecting a category', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const Resolved = await AddPage();
    render(Resolved);

    fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(/category is required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits a POST with the selected category in the payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const Resolved = await AddPage();
    render(Resolved);

    fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Crypto' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.category).toBe('Crypto');
  });

  it('submits the chosen purchase date in the POST payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const Resolved = await AddPage();
    render(Resolved);

    fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Stocks' } });
    fireEvent.change(screen.getByLabelText(/purchase date/i), {
      target: { value: '2025-07-04' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.purchaseDate).toBe('2025-07-04');
  });

  it('submits the default (today) purchase date when the user does not change it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const Resolved = await AddPage();
    render(Resolved);

    fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Stocks' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.purchaseDate).toBe(today);
  });

  describe('notes', () => {
    it('submits the notes value in the POST payload when the user fills the textarea', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
      vi.stubGlobal('fetch', fetchMock);

      const Resolved = await AddPage();
      render(Resolved);

      fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Stocks' } });
      fireEvent.change(screen.getByLabelText(/notes/i), {
        target: { value: 'Bought after earnings beat' },
      });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.notes).toBe('Bought after earnings beat');
    });

    it('omits notes from the POST payload when the textarea is left empty', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
      vi.stubGlobal('fetch', fetchMock);

      const Resolved = await AddPage();
      render(Resolved);

      fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Stocks' } });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body).not.toHaveProperty('notes');
    });
  });

  describe('custom labels (free-text chips)', () => {
    function getLabelsInput(): HTMLInputElement {
      return screen.getByPlaceholderText(/add a label/i) as HTMLInputElement;
    }

    it('renders a free-text labels input', async () => {
      const Resolved = await AddPage();
      render(Resolved);

      expect(getLabelsInput()).toBeInTheDocument();
    });

    it('turns typed values into chips separated by Enter or comma', async () => {
      const Resolved = await AddPage();
      render(Resolved);

      const input = getLabelsInput();

      fireEvent.change(input, { target: { value: 'alpha' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      fireEvent.change(input, { target: { value: 'beta,' } });

      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
    });

    it('submits the chips as labels in the POST payload', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
      vi.stubGlobal('fetch', fetchMock);

      const Resolved = await AddPage();
      render(Resolved);

      fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Stocks' } });

      const input = getLabelsInput();
      fireEvent.change(input, { target: { value: 'long-term' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.change(input, { target: { value: 'tech' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.labels).toEqual(['long-term', 'tech']);
    });

    it('lets the user remove a chip before submitting', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
      vi.stubGlobal('fetch', fetchMock);

      const Resolved = await AddPage();
      render(Resolved);

      fireEvent.change(screen.getByLabelText(/instrument/i), { target: { value: 'AAPL' } });
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '150' } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Stocks' } });

      const input = getLabelsInput();
      fireEvent.change(input, { target: { value: 'to-remove' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      const removeButton = screen.getByRole('button', { name: /remove to-remove/i });
      fireEvent.click(removeButton);

      expect(screen.queryByText('to-remove')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.labels).toEqual([]);
    });
  });
});
