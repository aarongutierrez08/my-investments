import { describe, it, expect, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createInvestment,
  deleteInvestment,
  getInvestment,
  listInvestments,
  updateInvestment,
} from './storage';
import type { Investment } from '../types';

type Row = Record<string, unknown>;

interface FakeDb {
  investments: Row[];
  investment_labels: Array<{ investment_id: string; label_id: string }>;
}

function makeFakeClient(db: FakeDb): SupabaseClient {
  function from(table: 'investments' | 'investment_labels') {
    const filters: Array<[string, unknown]> = [];
    let op: 'select' | 'insert' | 'update' | 'delete' | null = null;
    let payload: unknown = null;
    let single = false;
    let nestedJoin = false;

    function execute(): { data: unknown; error: null } {
      let rows = (db[table] as Row[]).slice();
      for (const [col, val] of filters) {
        rows = rows.filter((row) => row[col] === val);
      }

      switch (op) {
        case 'select': {
          let data: unknown = rows;
          if (nestedJoin && table === 'investments') {
            data = rows.map((row) => ({
              ...row,
              investment_labels: db.investment_labels
                .filter((link) => link.investment_id === row.id)
                .map((link) => ({ label_id: link.label_id })),
            }));
          }
          if (single) {
            data = (data as unknown[])[0] ?? null;
          }
          return { data, error: null };
        }
        case 'insert': {
          const list = Array.isArray(payload) ? payload : [payload];
          (db[table] as Row[]).push(...(list as Row[]));
          return { data: list, error: null };
        }
        case 'update': {
          for (const row of rows) {
            Object.assign(row, payload);
          }
          return { data: rows, error: null };
        }
        case 'delete': {
          const target = db[table] as Row[];
          const remaining = target.filter((row) => !rows.includes(row));
          target.length = 0;
          target.push(...remaining);
          return { data: rows, error: null };
        }
        default:
          throw new Error('Operation not set on fake client.');
      }
    }

    const builder = {
      select(cols: string) {
        op = 'select';
        nestedJoin = cols.includes('investment_labels');
        return builder;
      },
      insert(value: unknown) {
        op = 'insert';
        payload = value;
        return builder;
      },
      update(value: unknown) {
        op = 'update';
        payload = value;
        return builder;
      },
      delete() {
        op = 'delete';
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      maybeSingle() {
        single = true;
        return builder;
      },
      then(
        onFulfilled: (result: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(execute()).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return { from } as unknown as SupabaseClient;
}

function dbRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'inv-1',
    instrument: 'AAPL',
    amount: '10',
    price: '150',
    category: 'Stocks',
    purchase_date: '2026-01-15',
    notes: null,
    labels: [],
    ...overrides,
  };
}

describe('lib/investments/storage', () => {
  let db: FakeDb;
  let client: SupabaseClient;

  beforeEach(() => {
    db = { investments: [], investment_labels: [] };
    client = makeFakeClient(db);
  });

  describe('listInvestments', () => {
    it('returns an empty array when there are no rows', async () => {
      expect(await listInvestments(client)).toEqual([]);
    });

    it('returns every investment with its labelIds resolved from the join table', async () => {
      db.investments.push(dbRow({ id: 'inv-1', instrument: 'AAPL' }));
      db.investments.push(dbRow({ id: 'inv-2', instrument: 'BTC' }));
      db.investment_labels.push({ investment_id: 'inv-1', label_id: 'lbl-a' });
      db.investment_labels.push({ investment_id: 'inv-1', label_id: 'lbl-b' });

      const result = await listInvestments(client);
      expect(result).toHaveLength(2);

      const aapl = result.find((inv) => inv.id === 'inv-1');
      expect(aapl?.labelIds).toEqual(['lbl-a', 'lbl-b']);

      const btc = result.find((inv) => inv.id === 'inv-2');
      expect(btc?.labelIds).toEqual([]);
    });

    it('parses NUMERIC strings back into numbers without drift on round-trip', async () => {
      db.investments.push(dbRow({ id: 'inv-1', amount: '0.1', price: '0.2' }));

      const [investment] = await listInvestments(client);
      expect(investment.amount).toBe(0.1);
      expect(investment.price).toBe(0.2);
    });

    it('omits notes when the column is null', async () => {
      db.investments.push(dbRow({ notes: null }));
      const [investment] = await listInvestments(client);
      expect(investment).not.toHaveProperty('notes');
    });

    it('exposes notes when the column is a string', async () => {
      db.investments.push(dbRow({ notes: 'hello' }));
      const [investment] = await listInvestments(client);
      expect(investment.notes).toBe('hello');
    });

    it('preserves the free-text labels array stored on the row', async () => {
      db.investments.push(dbRow({ labels: ['long-term', 'tech'] }));
      const [investment] = await listInvestments(client);
      expect(investment.labels).toEqual(['long-term', 'tech']);
    });
  });

  describe('getInvestment', () => {
    it('returns null when the id does not exist', async () => {
      expect(await getInvestment('missing', client)).toBeNull();
    });

    it('returns the matching investment with labelIds when it exists', async () => {
      db.investments.push(dbRow({ id: 'inv-1' }));
      db.investment_labels.push({ investment_id: 'inv-1', label_id: 'lbl-a' });

      const investment = await getInvestment('inv-1', client);
      expect(investment).not.toBeNull();
      expect(investment?.id).toBe('inv-1');
      expect(investment?.labelIds).toEqual(['lbl-a']);
    });
  });

  describe('createInvestment', () => {
    it('inserts the row and returns the persisted investment', async () => {
      const investment: Investment = {
        id: 'inv-1',
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      const created = await createInvestment(investment, client);

      expect(created.id).toBe('inv-1');
      expect(db.investments).toHaveLength(1);
      expect(db.investments[0].amount).toBe('10');
      expect(db.investments[0].price).toBe('150');
    });

    it('inserts join rows for every labelId', async () => {
      const investment: Investment = {
        id: 'inv-1',
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: ['lbl-a', 'lbl-b'],
        labels: [],
      };

      await createInvestment(investment, client);

      expect(db.investment_labels).toEqual([
        { investment_id: 'inv-1', label_id: 'lbl-a' },
        { investment_id: 'inv-1', label_id: 'lbl-b' },
      ]);
    });

    it('persists notes as null when omitted', async () => {
      const investment: Investment = {
        id: 'inv-1',
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      await createInvestment(investment, client);

      expect(db.investments[0].notes).toBeNull();
    });

    it('round-trips money values like 0.1 and 0.2 without drift', async () => {
      const investment: Investment = {
        id: 'inv-1',
        instrument: 'AAPL',
        amount: 0.1,
        price: 0.2,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        labels: [],
      };

      const created = await createInvestment(investment, client);

      expect(created.amount).toBe(0.1);
      expect(created.price).toBe(0.2);
    });

    it('persists the free-text labels array', async () => {
      const investment: Investment = {
        id: 'inv-1',
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        labels: ['long-term', 'tech'],
      };

      await createInvestment(investment, client);

      expect(db.investments[0].labels).toEqual(['long-term', 'tech']);
    });
  });

  describe('updateInvestment', () => {
    beforeEach(() => {
      db.investments.push(
        dbRow({ id: 'inv-1', instrument: 'AAPL', amount: '10', price: '150' }),
      );
      db.investment_labels.push({ investment_id: 'inv-1', label_id: 'lbl-old' });
    });

    it('returns null when the id does not exist', async () => {
      expect(await updateInvestment('missing', { price: 99 }, client)).toBeNull();
    });

    it('updates only the columns present in the patch', async () => {
      const updated = await updateInvestment('inv-1', { price: 200 }, client);

      expect(updated?.price).toBe(200);
      expect(updated?.instrument).toBe('AAPL');
      expect(db.investments[0].price).toBe('200');
      expect(db.investments[0].amount).toBe('10');
    });

    it('replaces the labelIds set when provided', async () => {
      const updated = await updateInvestment(
        'inv-1',
        { labelIds: ['lbl-new-1', 'lbl-new-2'] },
        client,
      );

      expect(updated?.labelIds).toEqual(['lbl-new-1', 'lbl-new-2']);
      expect(db.investment_labels).toEqual([
        { investment_id: 'inv-1', label_id: 'lbl-new-1' },
        { investment_id: 'inv-1', label_id: 'lbl-new-2' },
      ]);
    });

    it('clears the labelIds when given an empty array', async () => {
      const updated = await updateInvestment('inv-1', { labelIds: [] }, client);

      expect(updated?.labelIds).toEqual([]);
      expect(db.investment_labels).toHaveLength(0);
    });

    it('leaves labelIds untouched when the patch omits them', async () => {
      const updated = await updateInvestment('inv-1', { instrument: 'MSFT' }, client);

      expect(updated?.labelIds).toEqual(['lbl-old']);
      expect(db.investment_labels).toEqual([
        { investment_id: 'inv-1', label_id: 'lbl-old' },
      ]);
    });

    it('clears notes when the patch sets notes to undefined explicitly', async () => {
      db.investments[0].notes = 'old';
      const updated = await updateInvestment('inv-1', { notes: undefined }, client);

      expect(updated).not.toHaveProperty('notes');
      expect(db.investments[0].notes).toBeNull();
    });
  });

  describe('deleteInvestment', () => {
    it('removes the row when it exists', async () => {
      db.investments.push(dbRow({ id: 'inv-1' }));

      await deleteInvestment('inv-1', client);

      expect(db.investments).toHaveLength(0);
    });

    it('throws when the id does not exist', async () => {
      await expect(deleteInvestment('missing', client)).rejects.toThrow(/not found/);
    });
  });
});
