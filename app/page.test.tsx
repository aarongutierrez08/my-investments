import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HomePage from './page';
import { storage } from '../lib/storage';

vi.mock('../lib/storage', () => ({
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

describe('HomePage', () => {
  it('AC-001: displays a message when there are no investments', async () => {
    (storage.readAll as vi.Mock).mockResolvedValue({
      investments: [],
      labels: [],
    });

    const ResolvedHomePage = await HomePage();
    render(ResolvedHomePage);

    expect(
      await screen.findByText('No investments yet. Add your first one.'),
    ).toBeInTheDocument();
  });

  it('renders an "Add investment" link that points to /add', async () => {
    (storage.readAll as vi.Mock).mockResolvedValue({
      investments: [],
      labels: [],
    });

    const ResolvedHomePage = await HomePage();
    render(ResolvedHomePage);

    const link = screen.getByRole('link', { name: /add investment/i }) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/add');
  });

  it('AC-002, AC-003, AC-004, AC-005: displays investments in a table with correct details', async () => {
    const mockLabel1 = { id: 'lbl1', name: 'Growth', color: '#0000FF' };
    const mockLabel2 = { id: 'lbl2', name: 'High Risk', color: '#FFFF00' };

    const mockInvestment1 = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 10,
      price: 150.0,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [mockLabel1.id],
      notes: 'Apple Stock',
    };

    const mockInvestment2 = {
      id: 'inv2',
      instrument: 'ETH',
      amount: 0.5,
      price: 2000.0,
      purchaseDate: '2023-03-20',
      category: 'Crypto',
      labelIds: [mockLabel1.id, mockLabel2.id],
      notes: 'Ethereum',
    };

    (storage.readAll as vi.Mock).mockResolvedValue({
      investments: [mockInvestment1, mockInvestment2],
      labels: [mockLabel1, mockLabel2],
    });

    const ResolvedHomePage = await HomePage();
    render(ResolvedHomePage);

    expect(screen.queryByText('No investments yet. Add your first one.')).not.toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: /Instrument/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Category/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Amount/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Price/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Purchase date/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Labels/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Total invested/i })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');

    const investment1Row = rows[1];
    expect(within(investment1Row).getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: 'Stocks' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '10' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '150.00' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '2023-01-15' })).toBeInTheDocument();
    expect(within(investment1Row).getByText('Growth')).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '1500.00' })).toBeInTheDocument();

    const investment2Row = rows[2];
    expect(within(investment2Row).getByRole('cell', { name: 'ETH' })).toBeInTheDocument();
    expect(within(investment2Row).getByRole('cell', { name: 'Crypto' })).toBeInTheDocument();
    expect(within(investment2Row).getByRole('cell', { name: '0.5' })).toBeInTheDocument();
    expect(within(investment2Row).getByRole('cell', { name: '2000.00' })).toBeInTheDocument();
    expect(within(investment2Row).getByRole('cell', { name: '2023-03-20' })).toBeInTheDocument();
    expect(within(investment2Row).getByText('Growth')).toBeInTheDocument();
    expect(within(investment2Row).getByText('High Risk')).toBeInTheDocument();
    expect(within(investment2Row).getByRole('cell', { name: '1000.00' })).toBeInTheDocument();
  });

  describe('filter by category', () => {
    const mockStocks = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 10,
      price: 150.0,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
    };
    const mockCrypto = {
      id: 'inv2',
      instrument: 'BTC',
      amount: 1,
      price: 30000.0,
      purchaseDate: '2023-02-20',
      category: 'Crypto',
      labelIds: [],
    };
    const mockBonds = {
      id: 'inv3',
      instrument: 'US10Y',
      amount: 5,
      price: 100.0,
      purchaseDate: '2023-03-10',
      category: 'Bonds',
      labelIds: [],
    };

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [mockStocks, mockCrypto, mockBonds],
        labels: [],
      });
    });

    it('AC-001: renders a "Filter by category" dropdown above the table', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by category/i });
      expect(select).toBeInTheDocument();
    });

    it('AC-005: dropdown options include "All categories" and every category', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by category/i }) as HTMLSelectElement;
      const optionValues = Array.from(select.options).map((o) => o.textContent);

      expect(optionValues).toContain('All categories');
      expect(optionValues).toContain('Stocks');
      expect(optionValues).toContain('Crypto');
      expect(optionValues).toContain('Real Estate');
      expect(optionValues).toContain('Bonds');
      expect(optionValues).toContain('Cash');
      expect(optionValues).toContain('Other');
    });

    it('AC-002: shows only matching investments when a category is selected', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(select, { target: { value: 'Stocks' } });

      expect(screen.getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
      expect(screen.queryByRole('cell', { name: 'BTC' })).not.toBeInTheDocument();
      expect(screen.queryByRole('cell', { name: 'US10Y' })).not.toBeInTheDocument();
    });

    it('AC-003: selecting "All categories" shows every investment again', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(select, { target: { value: 'Stocks' } });
      expect(screen.queryByRole('cell', { name: 'BTC' })).not.toBeInTheDocument();

      fireEvent.change(select, { target: { value: '' } });

      expect(screen.getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'BTC' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'US10Y' })).toBeInTheDocument();
    });

    it('AC-004: shows an empty-state message when no investments match the filter', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(select, { target: { value: 'Real Estate' } });

      expect(screen.getByText(/no investments in this category/i)).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('custom labels on investment rows', () => {
    const labelGrowth = { id: 'lbl-growth', name: 'Growth', color: '#0000FF' };
    const labelHighRisk = { id: 'lbl-high-risk', name: 'High Risk', color: '#FF0000' };

    const invWithOneLabel = {
      id: 'inv-with-one-label',
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [labelGrowth.id],
    };

    const invWithoutLabels = {
      id: 'inv-without-labels',
      instrument: 'BTC',
      amount: 1,
      price: 30000,
      purchaseDate: '2023-02-20',
      category: 'Crypto',
      labelIds: [],
    };

    const invWithOtherLabel = {
      id: 'inv-with-other-label',
      instrument: 'ETH',
      amount: 2,
      price: 2000,
      purchaseDate: '2023-03-10',
      category: 'Crypto',
      labelIds: [labelHighRisk.id],
    };

    function findRowByInstrument(instrument: string) {
      const rows = screen.getAllByRole('row');
      return rows.find((row) =>
        within(row).queryByRole('cell', { name: instrument }),
      )!;
    }

    it('AC-001: renders a chip for each label attached to the investment', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invWithOneLabel],
        labels: [labelGrowth, labelHighRisk],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const row = findRowByInstrument('AAPL');
      expect(within(row).getByText(labelGrowth.name)).toBeInTheDocument();
    });

    it('AC-002: renders no chip and no placeholder when labelIds is empty', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invWithoutLabels],
        labels: [labelGrowth, labelHighRisk],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const row = findRowByInstrument('BTC');
      expect(within(row).queryByText(labelGrowth.name)).not.toBeInTheDocument();
      expect(within(row).queryByText(labelHighRisk.name)).not.toBeInTheDocument();
      expect(within(row).queryByText(/no labels/i)).not.toBeInTheDocument();
    });

    it('AC-003: each row shows only its own labels (no cross-row leakage)', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invWithOneLabel, invWithOtherLabel],
        labels: [labelGrowth, labelHighRisk],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const rowWithGrowth = findRowByInstrument('AAPL');
      const rowWithHighRisk = findRowByInstrument('ETH');

      expect(within(rowWithGrowth).getByText(labelGrowth.name)).toBeInTheDocument();
      expect(within(rowWithGrowth).queryByText(labelHighRisk.name)).not.toBeInTheDocument();

      expect(within(rowWithHighRisk).getByText(labelHighRisk.name)).toBeInTheDocument();
      expect(within(rowWithHighRisk).queryByText(labelGrowth.name)).not.toBeInTheDocument();
    });
  });

  describe('delete investment', () => {
    const mockInvestment1 = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 10,
      price: 150.0,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
    };
    const mockInvestment2 = {
      id: 'inv2',
      instrument: 'GOOG',
      amount: 5,
      price: 200.0,
      purchaseDate: '2023-02-20',
      category: 'Stocks',
      labelIds: [],
    };

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [mockInvestment1, mockInvestment2],
        labels: [],
      });
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('renders a Delete button for each investment row', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it('renders an Edit link for each investment row pointing to /edit/<id>', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const editLinks = screen.getAllByRole('link', { name: /edit/i });
      expect(editLinks).toHaveLength(2);

      const rows = screen.getAllByRole('row');
      const aaplRow = rows.find((row) =>
        within(row).queryByRole('cell', { name: 'AAPL' }),
      )!;
      const aaplEditLink = within(aaplRow).getByRole('link', { name: /edit/i }) as HTMLAnchorElement;
      expect(aaplEditLink.getAttribute('href')).toBe('/edit/inv1');
    });

    it('calls DELETE /api/investments/<id> when the user confirms', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const Resolved = await HomePage();
      render(Resolved);

      const rows = screen.getAllByRole('row');
      const aaplRow = rows.find((row) =>
        within(row).queryByRole('cell', { name: 'AAPL' }),
      )!;
      const deleteButton = within(aaplRow).getByRole('button', { name: /delete/i });

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/investments/inv1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('does NOT call fetch when the user cancels the confirm dialog', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const Resolved = await HomePage();
      render(Resolved);

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      fireEvent.click(deleteButton);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows an inline error message when the API call fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const Resolved = await HomePage();
      render(Resolved);

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      fireEvent.click(deleteButton);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/failed/i);
    });
  });
});
