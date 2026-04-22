import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from './page';
import { storage } from '../lib/storage';

// Mock the storage module
vi.mock('../lib/storage', () => ({
  storage: {
    readAll: vi.fn(),
  },
}));

describe('HomePage', () => {
  it('AC-001: displays a message when there are no investments', async () => {
    // Mock storage.readAll to return an empty portfolio
    (storage.readAll as vi.Mock).mockResolvedValue({
      investments: [],
      categories: [],
      labels: [],
    });

    const ResolvedHomePage = await HomePage();
    render(ResolvedHomePage);

    // Expect the empty state message to be displayed
    expect(await screen.findByText('No investments yet. Add your first one.')).toBeInTheDocument();
  });

  it('AC-002, AC-003, AC-004, AC-005: displays investments in a table with correct details', async () => {
    // Define mock data
    const mockCategory1 = { id: 'cat1', name: 'Stocks', color: '#FF0000' };
    const mockCategory2 = { id: 'cat2', name: 'Crypto', color: '#00FF00' };
    const mockLabel1 = { id: 'lbl1', name: 'Growth', color: '#0000FF' };
    const mockLabel2 = { id: 'lbl2', name: 'High Risk', color: '#FFFF00' };

    const mockInvestment1 = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 10,
      price: 150.00,
      purchaseDate: '2023-01-15',
      categoryId: mockCategory1.id,
      labelIds: [mockLabel1.id],
      notes: 'Apple Stock',
    };

    const mockInvestment2 = {
      id: 'inv2',
      instrument: 'ETH',
      amount: 0.5,
      price: 2000.00,
      purchaseDate: '2023-03-20',
      categoryId: mockCategory2.id,
      labelIds: [mockLabel1.id, mockLabel2.id],
      notes: 'Ethereum',
    };

    // Mock storage.readAll to return a portfolio with investments
    (storage.readAll as vi.Mock).mockResolvedValue({
      investments: [mockInvestment1, mockInvestment2],
      categories: [mockCategory1, mockCategory2],
      labels: [mockLabel1, mockLabel2],
    });

    const ResolvedHomePage = await HomePage();
    render(ResolvedHomePage);

    // AC-002: Ensure empty state message is NOT displayed
    expect(screen.queryByText('No investments yet. Add your first one.')).not.toBeInTheDocument();

    // AC-002: Ensure a table is displayed
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // AC-003: Ensure table headers are present
    expect(screen.getByRole('columnheader', { name: /Instrument/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Category/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Amount/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Price/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Purchase date/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Labels/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Total invested/i })).toBeInTheDocument();

    // AC-004 & AC-005: Verify investment details
    const rows = screen.getAllByRole('row');
    // First row is the header, so data rows start from index 1

    // Verify Investment 1 row (index 1)
    const investment1Row = rows[1];
    expect(within(investment1Row).getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: 'Stocks' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '10' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '150.00' })).toBeInTheDocument();
    expect(within(investment1Row).getByRole('cell', { name: '2023-01-15' })).toBeInTheDocument();
    expect(within(investment1Row).getByText('Growth')).toBeInTheDocument(); // Use getByText for labels as they are spans
    expect(within(investment1Row).getByRole('cell', { name: '1500.00' })).toBeInTheDocument();

    // Verify Investment 2 row (index 2)
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
});
