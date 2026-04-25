import { describe, it, expect } from 'vitest';
import { buildInvestmentsCsv } from './csv';
import type { Investment } from './types';

describe('buildInvestmentsCsv', () => {
  it('returns only the header row when given an empty list', () => {
    const csv = buildInvestmentsCsv([]);

    expect(csv).toBe('name,category,amount,price,purchaseDate,notes');
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
      notes: 'Bought after earnings',
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('name,category,amount,price,purchaseDate,notes');
    expect(lines[1]).toBe(
      'AAPL,Stocks,10,150,2023-01-15,Bought after earnings',
    );
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
    };

    const csv = buildInvestmentsCsv([investment]);
    const lines = csv.split('\n');

    expect(lines[1].endsWith(',')).toBe(true);
    expect(lines[1]).toBe('AAPL,Stocks,1,150,2024-01-01,');
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
      notes: 'Line one, still one.\nHe said "hi"',
    };

    const csv = buildInvestmentsCsv([investment]);

    expect(csv).toContain('"Line one, still one.\nHe said ""hi"""');
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
      },
      {
        id: '2',
        instrument: 'BTC',
        amount: 1,
        price: 1,
        purchaseDate: '2024-01-02',
        category: 'Crypto',
        labelIds: [],
      },
    ];

    const csv = buildInvestmentsCsv(investments);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3);
  });
});
