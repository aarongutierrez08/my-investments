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

  describe('custom free-text labels on investment rows', () => {
    function findRowByInstrument(instrument: string) {
      const rows = screen.getAllByRole('row');
      return rows.find((row) =>
        within(row).queryByRole('cell', { name: new RegExp(instrument, 'i') }),
      )!;
    }

    it('renders each free-text label as a badge next to the instrument name', async () => {
      const investment = {
        id: 'inv-with-labels',
        instrument: 'AAPL',
        amount: 1,
        price: 100,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        labels: ['crypto', 'long-term'],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [investment],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const row = findRowByInstrument('AAPL');
      expect(within(row).getByText('crypto')).toBeInTheDocument();
      expect(within(row).getByText('long-term')).toBeInTheDocument();
    });

    it('renders nothing extra when the investment has no free-text labels', async () => {
      const investment = {
        id: 'inv-no-labels',
        instrument: 'AAPL',
        amount: 1,
        price: 100,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [investment],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const row = findRowByInstrument('AAPL');
      expect(within(row).queryByText(/no labels/i)).not.toBeInTheDocument();
    });
  });

  describe('total invested summary', () => {
    it('AC-001: shows "Total invested: $<sum>" above the table with the sum of all amounts', async () => {
      const inv1 = {
        id: 'i1',
        instrument: 'A',
        amount: 100,
        price: 1,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
      };
      const inv2 = {
        id: 'i2',
        instrument: 'B',
        amount: 250,
        price: 1,
        purchaseDate: '2023-01-02',
        category: 'Stocks',
        labelIds: [],
      };
      const inv3 = {
        id: 'i3',
        instrument: 'C',
        amount: 75,
        price: 1,
        purchaseDate: '2023-01-03',
        category: 'Stocks',
        labelIds: [],
      };
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [inv1, inv2, inv3],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByText('Total invested: $425')).toBeInTheDocument();
    });

    it('AC-002: shows "Total invested: $0" when the investments list is empty', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByText('Total invested: $0')).toBeInTheDocument();
    });

    it('AC-003: total reflects only the filtered-in investments when a category filter is active', async () => {
      const stockInv = {
        id: 'i1',
        instrument: 'A',
        amount: 100,
        price: 1,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
      };
      const cryptoInv = {
        id: 'i2',
        instrument: 'B',
        amount: 250,
        price: 1,
        purchaseDate: '2023-01-02',
        category: 'Crypto',
        labelIds: [],
      };
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [stockInv, cryptoInv],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByText('Total invested: $350')).toBeInTheDocument();

      const select = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(select, { target: { value: 'Stocks' } });

      expect(screen.getByText('Total invested: $100')).toBeInTheDocument();
    });
  });

  describe('filter by custom label', () => {
    const invCryptoLong = {
      id: 'inv1',
      instrument: 'BTC',
      amount: 1,
      price: 30000,
      purchaseDate: '2023-01-15',
      category: 'Crypto',
      labelIds: [],
      labels: ['long-term', 'crypto'],
    };
    const invStockLong = {
      id: 'inv2',
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2023-02-20',
      category: 'Stocks',
      labelIds: [],
      labels: ['long-term', 'dividends'],
    };
    const invStockShort = {
      id: 'inv3',
      instrument: 'TSLA',
      amount: 2,
      price: 200,
      purchaseDate: '2023-03-10',
      category: 'Stocks',
      labelIds: [],
      labels: ['short-term'],
    };

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invCryptoLong, invStockLong, invStockShort],
        labels: [],
      });
    });

    it('AC-001: renders a "Filter by label" dropdown with all labels in use (deduplicated, sorted) plus "All labels"', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by label/i }) as HTMLSelectElement;
      const optionTexts = Array.from(select.options).map((o) => o.textContent);

      expect(optionTexts).toEqual(['All labels', 'crypto', 'dividends', 'long-term', 'short-term']);
    });

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.match(/^[A-Z]+/)?.[0] ?? '',
      );
    }

    it('AC-002: shows only investments that include the selected label', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const select = screen.getByRole('combobox', { name: /filter by label/i });
      fireEvent.change(select, { target: { value: 'long-term' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('BTC');
      expect(instruments).toContain('AAPL');
      expect(instruments).not.toContain('TSLA');
    });

    it('AC-003: combines with the category filter (AND)', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(categorySelect, { target: { value: 'Stocks' } });

      const labelSelect = screen.getByRole('combobox', { name: /filter by label/i });
      fireEvent.change(labelSelect, { target: { value: 'long-term' } });

      const instruments = visibleInstruments();
      expect(instruments).toEqual(['AAPL']);
    });

    it('selecting "All labels" restores the list to what the category filter alone would show', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(categorySelect, { target: { value: 'Stocks' } });

      const labelSelect = screen.getByRole('combobox', { name: /filter by label/i });
      fireEvent.change(labelSelect, { target: { value: 'long-term' } });
      expect(visibleInstruments()).not.toContain('TSLA');

      fireEvent.change(labelSelect, { target: { value: '' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('AAPL');
      expect(instruments).toContain('TSLA');
      expect(instruments).not.toContain('BTC');
    });
  });

  describe('search by name', () => {
    const invApple = {
      id: 'inv1',
      instrument: 'Apple Inc',
      amount: 10,
      price: 150,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invMicrosoft = {
      id: 'inv2',
      instrument: 'Microsoft',
      amount: 5,
      price: 300,
      purchaseDate: '2023-02-20',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invBitcoin = {
      id: 'inv3',
      instrument: 'Bitcoin',
      amount: 1,
      price: 30000,
      purchaseDate: '2023-03-10',
      category: 'Crypto',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invApple, invMicrosoft, invBitcoin],
        labels: [],
      });
    });

    it('AC-001: renders a search input with placeholder "Search by name..."', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const search = screen.getByPlaceholderText('Search by name...');
      expect(search).toBeInTheDocument();
    });

    it('AC-002: typing a substring leaves only the matching rows visible', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const search = screen.getByPlaceholderText('Search by name...');
      fireEvent.change(search, { target: { value: 'Apple' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('Apple Inc');
      expect(instruments).not.toContain('Microsoft');
      expect(instruments).not.toContain('Bitcoin');
    });

    it('AC-002: matches case-insensitively (typing "apple" matches "Apple Inc")', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const search = screen.getByPlaceholderText('Search by name...');
      fireEvent.change(search, { target: { value: 'apple' } });

      const instruments = visibleInstruments();
      expect(instruments).toEqual(['Apple Inc']);
    });

    it('AC-002: trims whitespace from the query before matching', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const search = screen.getByPlaceholderText('Search by name...');
      fireEvent.change(search, { target: { value: '  apple  ' } });

      const instruments = visibleInstruments();
      expect(instruments).toEqual(['Apple Inc']);
    });

    it('AC-003: composes with an active category filter (AND)', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(categorySelect, { target: { value: 'Stocks' } });

      const search = screen.getByPlaceholderText('Search by name...');
      fireEvent.change(search, { target: { value: 'apple' } });

      const instruments = visibleInstruments();
      expect(instruments).toEqual(['Apple Inc']);
    });

    it('clearing the search restores the list to what other filters alone would show', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(categorySelect, { target: { value: 'Stocks' } });

      const search = screen.getByPlaceholderText('Search by name...');
      fireEvent.change(search, { target: { value: 'apple' } });
      expect(visibleInstruments()).toEqual(['Apple Inc']);

      fireEvent.change(search, { target: { value: '' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('Apple Inc');
      expect(instruments).toContain('Microsoft');
      expect(instruments).not.toContain('Bitcoin');
    });
  });

  describe('total by category breakdown', () => {
    it('AC-001: shows a row per category with the sum of investment amounts', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [
          {
            id: 's1',
            instrument: 'AAPL',
            amount: 100,
            price: 1,
            purchaseDate: '2023-01-01',
            category: 'Stocks',
            labelIds: [],
          },
          {
            id: 's2',
            instrument: 'GOOG',
            amount: 200,
            price: 1,
            purchaseDate: '2023-01-02',
            category: 'Stocks',
            labelIds: [],
          },
          {
            id: 'c1',
            instrument: 'BTC',
            amount: 700,
            price: 1,
            purchaseDate: '2023-01-03',
            category: 'Crypto',
            labelIds: [],
          },
        ],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(
        screen.getByRole('heading', { name: /total by category/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Stocks: $300')).toBeInTheDocument();
      expect(screen.getByText('Crypto: $700')).toBeInTheDocument();
    });

    it('AC-002: groups investments without a category under an "Uncategorized" row', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [
          {
            id: 's1',
            instrument: 'AAPL',
            amount: 100,
            price: 1,
            purchaseDate: '2023-01-01',
            category: 'Stocks',
            labelIds: [],
          },
          {
            id: 's2',
            instrument: 'GOOG',
            amount: 200,
            price: 1,
            purchaseDate: '2023-01-02',
            category: 'Stocks',
            labelIds: [],
          },
          {
            id: 'u1',
            instrument: 'XYZ',
            amount: 75,
            price: 1,
            purchaseDate: '2023-01-03',
            labelIds: [],
          },
        ],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByText('Stocks: $300')).toBeInTheDocument();
      expect(screen.getByText('Uncategorized: $75')).toBeInTheDocument();
    });

    it('AC-003: does not render the breakdown section when there are no investments', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(
        screen.queryByRole('heading', { name: /total by category/i }),
      ).not.toBeInTheDocument();
    });

    it('does not list categories that have no investments', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [
          {
            id: 's1',
            instrument: 'AAPL',
            amount: 100,
            price: 1,
            purchaseDate: '2023-01-01',
            category: 'Stocks',
            labelIds: [],
          },
        ],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByText('Stocks: $100')).toBeInTheDocument();
      expect(screen.queryByText(/^Crypto:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Bonds:/)).not.toBeInTheDocument();
    });
  });

  describe('sort by amount', () => {
    const invSmall = {
      id: 'inv1',
      instrument: 'SMALL',
      amount: 5,
      price: 1,
      purchaseDate: '2023-01-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invLarge = {
      id: 'inv2',
      instrument: 'LARGE',
      amount: 100,
      price: 1,
      purchaseDate: '2023-02-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invMid = {
      id: 'inv3',
      instrument: 'MID',
      amount: 50,
      price: 1,
      purchaseDate: '2023-03-01',
      category: 'Crypto',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invSmall, invLarge, invMid],
        labels: [],
      });
    });

    it('AC-001: sorts rows from highest to lowest amount by default', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['LARGE', 'MID', 'SMALL']);
    });

    it('AC-002: clicking once toggles to ascending; a second click returns to insertion order', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const sortButton = screen.getByRole('button', { name: /sort by amount/i });
      fireEvent.click(sortButton);
      expect(visibleInstruments()).toEqual(['SMALL', 'MID', 'LARGE']);

      fireEvent.click(sortButton);
      expect(visibleInstruments()).toEqual(['SMALL', 'LARGE', 'MID']);
    });

    it('AC-003: sorting applies only to the filtered subset', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(categorySelect, { target: { value: 'Stocks' } });

      expect(visibleInstruments()).toEqual(['LARGE', 'SMALL']);
    });
  });

  describe('sort by purchase date', () => {
    const invOldDate = {
      id: 'inv-old',
      instrument: 'GOOG',
      amount: 10,
      price: 1,
      purchaseDate: '2022-03-20',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invMidDate = {
      id: 'inv-mid',
      instrument: 'TSLA',
      amount: 50,
      price: 1,
      purchaseDate: '2023-01-10',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invNewDate = {
      id: 'inv-new',
      instrument: 'AAPL',
      amount: 5,
      price: 1,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invNoDate = {
      id: 'inv-nodate',
      instrument: 'MSFT',
      amount: 20,
      price: 1,
      purchaseDate: '',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    it('AC-001: exposes a "Sort by date" control alongside the existing "Sort by amount" control', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invOldDate, invMidDate, invNewDate],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByRole('button', { name: /sort by amount/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by date/i })).toBeInTheDocument();
    });

    it('AC-002: sorts rows newest first when "Date (newest first)" is selected', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invOldDate, invNewDate, invMidDate],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortDateButton = screen.getByRole('button', { name: /sort by date/i });
      fireEvent.click(sortDateButton);

      expect(visibleInstruments()).toEqual(['AAPL', 'TSLA', 'GOOG']);
    });

    it('AC-003: sorts rows oldest first when "Date (oldest first)" is selected', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invOldDate, invNewDate, invMidDate],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortDateButton = screen.getByRole('button', { name: /sort by date/i });
      fireEvent.click(sortDateButton);
      fireEvent.click(sortDateButton);

      expect(visibleInstruments()).toEqual(['GOOG', 'TSLA', 'AAPL']);
    });

    it('AC-002: places investments without a purchase date at the bottom when sorting newest first', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invNoDate, invOldDate, invNewDate, invMidDate],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortDateButton = screen.getByRole('button', { name: /sort by date/i });
      fireEvent.click(sortDateButton);

      expect(visibleInstruments()).toEqual(['AAPL', 'TSLA', 'GOOG', 'MSFT']);
    });

    it('AC-003: places investments without a purchase date at the top when sorting oldest first', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invOldDate, invNewDate, invNoDate, invMidDate],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortDateButton = screen.getByRole('button', { name: /sort by date/i });
      fireEvent.click(sortDateButton);
      fireEvent.click(sortDateButton);

      expect(visibleInstruments()).toEqual(['MSFT', 'GOOG', 'TSLA', 'AAPL']);
    });

    it('AC-004: amount sort still works after the date sort options are introduced (regression)', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invMidDate, invOldDate, invNewDate],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['TSLA', 'GOOG', 'AAPL']);

      const sortAmountButton = screen.getByRole('button', { name: /sort by amount/i });
      fireEvent.click(sortAmountButton);

      expect(visibleInstruments()).toEqual(['AAPL', 'GOOG', 'TSLA']);
    });
  });

  describe('purchase date sort direction toggle', () => {
    const invOldDate = {
      id: 'inv-old',
      instrument: 'GOOG',
      amount: 10,
      price: 1,
      purchaseDate: '2022-03-20',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invMidDate = {
      id: 'inv-mid',
      instrument: 'TSLA',
      amount: 50,
      price: 1,
      purchaseDate: '2023-01-10',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invNewDate = {
      id: 'inv-new',
      instrument: 'AAPL',
      amount: 5,
      price: 1,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    function getDateSortButton() {
      return screen.getByRole('button', { name: /sort by date/i });
    }

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invOldDate, invNewDate, invMidDate],
        labels: [],
      });
    });

    it('AC-001: defaults to newest-first when the purchase date sort is activated (regression for #33)', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      fireEvent.click(getDateSortButton());

      expect(visibleInstruments()).toEqual(['AAPL', 'TSLA', 'GOOG']);
      expect(getDateSortButton()).toHaveTextContent('↓');
    });

    it('AC-002: clicking the purchase date sort once more reverses the order to oldest-first', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      fireEvent.click(getDateSortButton());
      fireEvent.click(getDateSortButton());

      expect(visibleInstruments()).toEqual(['GOOG', 'TSLA', 'AAPL']);
    });

    it('AC-003: shows the ascending arrow indicator when toggled to oldest-first', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      fireEvent.click(getDateSortButton());
      fireEvent.click(getDateSortButton());

      expect(getDateSortButton()).toHaveTextContent('↑');
    });
  });

  describe('sort by name', () => {
    const invApple = {
      id: 'inv1',
      instrument: 'Apple',
      amount: 10,
      price: 1,
      purchaseDate: '2023-01-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invBanana = {
      id: 'inv2',
      instrument: 'banana',
      amount: 5,
      price: 1,
      purchaseDate: '2023-02-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invCherry = {
      id: 'inv3',
      instrument: 'cherry',
      amount: 3,
      price: 1,
      purchaseDate: '2023-03-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    it('AC-001: exposes a "Sort by name" control alongside the existing sort controls', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invApple, invBanana, invCherry],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByRole('button', { name: /sort by amount/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by date/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by name/i })).toBeInTheDocument();
    });

    it('AC-002: sorts rows A–Z (case-insensitive) on first click', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invCherry, invApple, invBanana],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);

      expect(visibleInstruments()).toEqual(['Apple', 'banana', 'cherry']);
    });

    it('AC-002: sorts rows Z–A on second click', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invApple, invBanana, invCherry],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);
      fireEvent.click(sortNameButton);

      expect(visibleInstruments()).toEqual(['cherry', 'banana', 'Apple']);
    });

    it('AC-003: uses locale-aware comparison so accented names sort naturally', async () => {
      const invAvila = {
        id: 'inv-avila',
        instrument: 'Ávila',
        amount: 1,
        price: 1,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const invAlvarez = {
        id: 'inv-alvarez',
        instrument: 'Alvarez',
        amount: 1,
        price: 1,
        purchaseDate: '2023-01-02',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const invBravo = {
        id: 'inv-bravo',
        instrument: 'Bravo',
        amount: 1,
        price: 1,
        purchaseDate: '2023-01-03',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invBravo, invAvila, invAlvarez],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);

      const instruments = visibleInstruments();
      expect(instruments[2]).toBe('Bravo');
      expect(instruments.slice(0, 2).sort()).toEqual(['Alvarez', 'Ávila'].sort());
      expect(instruments.indexOf('Bravo')).toBeGreaterThan(instruments.indexOf('Alvarez'));
      expect(instruments.indexOf('Bravo')).toBeGreaterThan(instruments.indexOf('Ávila'));
    });

    it('AC-003: case-insensitive ordering places "Apple" and "ápple" adjacently', async () => {
      const invApplePlain = {
        id: 'inv-apple',
        instrument: 'Apple',
        amount: 1,
        price: 1,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const invAppleAccented = {
        id: 'inv-apple-accented',
        instrument: 'ápple',
        amount: 1,
        price: 1,
        purchaseDate: '2023-01-02',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const invZebra = {
        id: 'inv-zebra',
        instrument: 'Zebra',
        amount: 1,
        price: 1,
        purchaseDate: '2023-01-03',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invZebra, invAppleAccented, invApplePlain],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);

      const instruments = visibleInstruments();
      expect(instruments[2]).toBe('Zebra');
      expect(instruments.slice(0, 2).sort()).toEqual(['Apple', 'ápple'].sort());
    });

    it('third click returns to insertion order', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invCherry, invApple, invBanana],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);
      fireEvent.click(sortNameButton);
      fireEvent.click(sortNameButton);

      expect(visibleInstruments()).toEqual(['cherry', 'Apple', 'banana']);
    });

    it('name sort replaces the default amount sort (mutually exclusive)', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invApple, invBanana, invCherry],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['Apple', 'banana', 'cherry']);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);

      expect(visibleInstruments()).toEqual(['Apple', 'banana', 'cherry']);

      fireEvent.click(sortNameButton);
      expect(visibleInstruments()).toEqual(['cherry', 'banana', 'Apple']);
    });

    it('name sort replaces an active date sort (mutually exclusive)', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invApple, invBanana, invCherry],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortDateButton = screen.getByRole('button', { name: /sort by date/i });
      fireEvent.click(sortDateButton);
      expect(visibleInstruments()).toEqual(['cherry', 'banana', 'Apple']);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);

      expect(visibleInstruments()).toEqual(['Apple', 'banana', 'cherry']);
    });

    it('does not alter the default amount-desc sort order before any name sort is applied', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invCherry, invApple, invBanana],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['Apple', 'banana', 'cherry']);
    });
  });

  describe('sort by category', () => {
    const invStocks = {
      id: 'inv-stocks',
      instrument: 'AAPL',
      amount: 10,
      price: 1,
      purchaseDate: '2023-01-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invBonds = {
      id: 'inv-bonds',
      instrument: 'US10Y',
      amount: 5,
      price: 1,
      purchaseDate: '2023-02-01',
      category: 'Bonds',
      labelIds: [],
      labels: [],
    };
    const invCrypto = {
      id: 'inv-crypto',
      instrument: 'BTC',
      amount: 1,
      price: 1,
      purchaseDate: '2023-03-01',
      category: 'Crypto',
      labelIds: [],
      labels: [],
    };
    const invNoCategory = {
      id: 'inv-no-cat',
      instrument: 'MYSTERY',
      amount: 2,
      price: 1,
      purchaseDate: '2023-04-01',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    it('AC-001: exposes a "Sort by category" control alongside the existing sort controls', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invStocks, invBonds, invCrypto],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(screen.getByRole('button', { name: /sort by category/i })).toBeInTheDocument();
    });

    it('AC-002: reorders rows by category name ascending (A→Z) when selected', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invStocks, invBonds, invCrypto],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortCategoryButton = screen.getByRole('button', { name: /sort by category/i });
      fireEvent.click(sortCategoryButton);

      expect(visibleInstruments()).toEqual(['US10Y', 'BTC', 'AAPL']);
    });

    it('AC-003: places uncategorized investments after all categorized ones', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invStocks, invNoCategory, invBonds],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortCategoryButton = screen.getByRole('button', { name: /sort by category/i });
      fireEvent.click(sortCategoryButton);

      expect(visibleInstruments()).toEqual(['US10Y', 'AAPL', 'MYSTERY']);
    });

    it('preserves the relative order of investments that share the same category (stable sort)', async () => {
      const invStocksA = { ...invStocks, id: 'stock-a', instrument: 'AFIRST' };
      const invStocksB = { ...invStocks, id: 'stock-b', instrument: 'BSECOND' };
      const invStocksC = { ...invStocks, id: 'stock-c', instrument: 'CTHIRD' };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invStocksA, invStocksB, invStocksC],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const sortCategoryButton = screen.getByRole('button', { name: /sort by category/i });
      fireEvent.click(sortCategoryButton);

      expect(visibleInstruments()).toEqual(['AFIRST', 'BSECOND', 'CTHIRD']);
    });

    it('category sort replaces an active amount sort (mutually exclusive)', async () => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invStocks, invBonds, invCrypto],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['AAPL', 'US10Y', 'BTC']);

      const sortCategoryButton = screen.getByRole('button', { name: /sort by category/i });
      fireEvent.click(sortCategoryButton);

      expect(visibleInstruments()).toEqual(['US10Y', 'BTC', 'AAPL']);
    });
  });

  describe('default sort by amount descending', () => {
    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    it('AC-001: renders investments ordered by amount descending on initial load', async () => {
      const inv100 = {
        id: 'inv-100',
        instrument: 'SMALL',
        amount: 100,
        price: 1,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const inv500 = {
        id: 'inv-500',
        instrument: 'LARGE',
        amount: 500,
        price: 1,
        purchaseDate: '2023-02-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const inv250 = {
        id: 'inv-250',
        instrument: 'MID',
        amount: 250,
        price: 1,
        purchaseDate: '2023-03-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [inv100, inv500, inv250],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['LARGE', 'MID', 'SMALL']);
    });

    it('AC-002: user-selected sort by name overrides the default amount-desc order', async () => {
      const inv100 = {
        id: 'inv-100',
        instrument: 'Zeta',
        amount: 100,
        price: 1,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const inv500 = {
        id: 'inv-500',
        instrument: 'Alpha',
        amount: 500,
        price: 1,
        purchaseDate: '2023-02-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const inv250 = {
        id: 'inv-250',
        instrument: 'Mango',
        amount: 250,
        price: 1,
        purchaseDate: '2023-03-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [inv100, inv500, inv250],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['Alpha', 'Mango', 'Zeta']);

      const sortNameButton = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(sortNameButton);

      expect(visibleInstruments()).toEqual(['Alpha', 'Mango', 'Zeta']);
    });

    it('AC-003: renders correctly when the portfolio contains a single investment', async () => {
      const onlyInvestment = {
        id: 'only',
        instrument: 'ONLY',
        amount: 42,
        price: 10,
        purchaseDate: '2023-01-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [onlyInvestment],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(visibleInstruments()).toEqual(['ONLY']);
    });
  });

  describe('purchase date column', () => {
    function findRowByInstrument(instrument: string) {
      const rows = screen.getAllByRole('row');
      return rows.find((row) =>
        within(row).queryByRole('cell', { name: instrument }),
      )!;
    }

    it('AC-001: shows the purchase date in each row that has one', async () => {
      const investment = {
        id: 'inv-dated',
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-03-14',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [investment],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const row = findRowByInstrument('AAPL');
      expect(within(row).getByRole('cell', { name: '2026-03-14' })).toBeInTheDocument();
    });

    it('AC-002: shows a — placeholder when an investment has no purchase date', async () => {
      const legacyInvestment = {
        id: 'inv-legacy',
        instrument: 'LEGACY',
        amount: 1,
        price: 1,
        purchaseDate: '',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [legacyInvestment],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      const row = findRowByInstrument('LEGACY');
      expect(within(row).getByRole('cell', { name: '—' })).toBeInTheDocument();
      expect(within(row).queryByText(/invalid date/i)).not.toBeInTheDocument();
    });

    it('AC-003: each row shows its own purchase date, not a shared one', async () => {
      const invA = {
        id: 'inv-a',
        instrument: 'AAA',
        amount: 1,
        price: 1,
        purchaseDate: '2026-01-10',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const invB = {
        id: 'inv-b',
        instrument: 'BBB',
        amount: 1,
        price: 1,
        purchaseDate: '2026-02-20',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };
      const invC = {
        id: 'inv-c',
        instrument: 'CCC',
        amount: 1,
        price: 1,
        purchaseDate: '2026-03-30',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invA, invB, invC],
        labels: [],
      });

      const Resolved = await HomePage();
      render(Resolved);

      expect(
        within(findRowByInstrument('AAA')).getByRole('cell', { name: '2026-01-10' }),
      ).toBeInTheDocument();
      expect(
        within(findRowByInstrument('BBB')).getByRole('cell', { name: '2026-02-20' }),
      ).toBeInTheDocument();
      expect(
        within(findRowByInstrument('CCC')).getByRole('cell', { name: '2026-03-30' }),
      ).toBeInTheDocument();
    });
  });

  describe('filter by purchase date range', () => {
    const invJan = {
      id: 'inv-jan',
      instrument: 'AAA',
      amount: 10,
      price: 1,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invFeb = {
      id: 'inv-feb',
      instrument: 'BBB',
      amount: 20,
      price: 1,
      purchaseDate: '2023-02-15',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invMar = {
      id: 'inv-mar',
      instrument: 'CCC',
      amount: 30,
      price: 1,
      purchaseDate: '2023-03-15',
      category: 'Crypto',
      labelIds: [],
      labels: [],
    };
    const invApr = {
      id: 'inv-apr',
      instrument: 'DDD',
      amount: 40,
      price: 1,
      purchaseDate: '2023-04-15',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    function visibleInstruments() {
      const table = screen.queryByRole('table');
      if (!table) {
        return [] as string[];
      }
      const bodyRows = within(table).getAllByRole('row').slice(1);
      return bodyRows.map(
        (row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '',
      );
    }

    beforeEach(() => {
      (storage.readAll as unknown as vi.Mock).mockResolvedValue({
        investments: [invJan, invFeb, invMar, invApr],
        labels: [],
      });
    });

    it('AC-001: shows only investments with purchaseDate >= from when only "From" is set', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const fromInput = screen.getByLabelText('From');
      fireEvent.change(fromInput, { target: { value: '2023-02-15' } });

      const instruments = visibleInstruments();
      expect(instruments).not.toContain('AAA');
      expect(instruments).toContain('BBB');
      expect(instruments).toContain('CCC');
      expect(instruments).toContain('DDD');
    });

    it('AC-002: shows only investments within the inclusive range and totals reflect those rows when both "From" and "To" are set', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const fromInput = screen.getByLabelText('From');
      const toInput = screen.getByLabelText('To');
      fireEvent.change(fromInput, { target: { value: '2023-02-15' } });
      fireEvent.change(toInput, { target: { value: '2023-03-15' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('BBB');
      expect(instruments).toContain('CCC');
      expect(instruments).not.toContain('AAA');
      expect(instruments).not.toContain('DDD');

      expect(screen.getByText('Total invested: $50')).toBeInTheDocument();
    });

    it('AC-003: composes with the category filter (AND)', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const fromInput = screen.getByLabelText('From');
      const toInput = screen.getByLabelText('To');
      fireEvent.change(fromInput, { target: { value: '2023-02-15' } });
      fireEvent.change(toInput, { target: { value: '2023-04-15' } });

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      fireEvent.change(categorySelect, { target: { value: 'Stocks' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('BBB');
      expect(instruments).toContain('DDD');
      expect(instruments).not.toContain('AAA');
      expect(instruments).not.toContain('CCC');
    });

    it('shows only investments with purchaseDate <= to when only "To" is set', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const toInput = screen.getByLabelText('To');
      fireEvent.change(toInput, { target: { value: '2023-02-15' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('AAA');
      expect(instruments).toContain('BBB');
      expect(instruments).not.toContain('CCC');
      expect(instruments).not.toContain('DDD');
    });

    it('includes investments whose purchaseDate equals the From or To boundary (range is inclusive)', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const fromInput = screen.getByLabelText('From');
      const toInput = screen.getByLabelText('To');
      fireEvent.change(fromInput, { target: { value: '2023-01-15' } });
      fireEvent.change(toInput, { target: { value: '2023-04-15' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('AAA');
      expect(instruments).toContain('DDD');
    });

    it('renders an empty list when From is later than To', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const fromInput = screen.getByLabelText('From');
      const toInput = screen.getByLabelText('To');
      fireEvent.change(fromInput, { target: { value: '2023-04-15' } });
      fireEvent.change(toInput, { target: { value: '2023-01-15' } });

      expect(visibleInstruments()).toEqual([]);
    });

    it('clearing the From date relaxes the filter and shows every investment again', async () => {
      const Resolved = await HomePage();
      render(Resolved);

      const fromInput = screen.getByLabelText('From');
      fireEvent.change(fromInput, { target: { value: '2023-03-01' } });
      expect(visibleInstruments()).not.toContain('AAA');

      fireEvent.change(fromInput, { target: { value: '' } });

      const instruments = visibleInstruments();
      expect(instruments).toContain('AAA');
      expect(instruments).toContain('BBB');
      expect(instruments).toContain('CCC');
      expect(instruments).toContain('DDD');
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
