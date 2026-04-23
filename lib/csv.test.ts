import { describe, it, expect } from 'vitest';
import { buildInvestmentsCsv } from './csv';
import type { Investment } from './types';

describe('buildInvestmentsCsv', () => {
  it('returns only the header row when given an empty list', () => {
    const csv = buildInvestmentsCsv([]);

    expect(csv).toBe('name,category,amount,price,purchaseDate,labels,notes');
  });

  it('formats a simple investment into a single data row after the header', () => {
    const investment: Investment = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2023-01-15',
      category: 'Stocks',
      labelIds: [],
      labels: ['growth', 'long-term'],
      notes: 'Bought after earnings',
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('name,category,amount,price,purchaseDate,labels,notes');
    expect(lines[1]).toBe(
      'AAPL,Stocks,10,150,2023-01-15,growth|long-term,Bought after earnings',
    );
  });

  it('joins labels with a pipe character', () => {
    const investment: Investment = {
      id: 'inv1',
      instrument: 'BTC',
      amount: 1,
      price: 30000,
      purchaseDate: '2023-02-20',
      category: 'Crypto',
      labelIds: [],
      labels: ['crypto', 'speculative', 'HODL'],
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('crypto|speculative|HODL');
  });

  it('renders an empty labels field when there are no labels', () => {
    const investment: Investment = {
      id: 'inv1',
      instrument: 'MSFT',
      amount: 5,
      price: 300,
      purchaseDate: '2024-06-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('MSFT,Stocks,5,300,2024-06-01,,');
  });

  it('wraps a name containing a comma in double quotes', () => {
    const investment: Investment = {
      id: 'inv1',
      instrument: 'Alphabet, Inc.',
      amount: 2,
      price: 140,
      purchaseDate: '2024-01-05',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines[1].startsWith('"Alphabet, Inc.",')).toBe(true);
  });

  it('escapes notes containing a comma, a double quote and a newline', () => {
    const investment: Investment = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 1,
      price: 150,
      purchaseDate: '2024-01-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
      notes: 'Line one, still one.\nHe said "hi"',
    };

    const csv = buildInvestmentsCsv([investment]);

    expect(csv).toContain('"Line one, still one.\nHe said ""hi"""');
  });

  it('renders an empty notes field when notes is undefined', () => {
    const investment: Investment = {
      id: 'inv1',
      instrument: 'AAPL',
      amount: 1,
      price: 150,
      purchaseDate: '2024-01-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines[1].endsWith(',')).toBe(true);
    expect(lines[1]).toBe('AAPL,Stocks,1,150,2024-01-01,,');
  });

  it('preserves the order of the input rows', () => {
    const invA: Investment = {
      id: 'a',
      instrument: 'AAA',
      amount: 1,
      price: 1,
      purchaseDate: '2024-01-01',
      category: 'Stocks',
      labelIds: [],
      labels: [],
    };
    const invB: Investment = { ...invA, id: 'b', instrument: 'BBB' };
    const invC: Investment = { ...invA, id: 'c', instrument: 'CCC' };

    const csv = buildInvestmentsCsv([invC, invA, invB]);
    const lines = csv.split('\n');

    expect(lines[1].startsWith('CCC,')).toBe(true);
    expect(lines[2].startsWith('AAA,')).toBe(true);
    expect(lines[3].startsWith('BBB,')).toBe(true);
  });

  it('renders multiple rows produced with the correct number of lines', () => {
    const investments: Investment[] = [
      {
        id: '1',
        instrument: 'AAPL',
        amount: 1,
        price: 1,
        purchaseDate: '2024-01-01',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      },
      {
        id: '2',
        instrument: 'BTC',
        amount: 1,
        price: 1,
        purchaseDate: '2024-01-02',
        category: 'Crypto',
        labelIds: [],
        labels: [],
      },
    ];

    const csv = buildInvestmentsCsv(investments);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3);
  });
});
